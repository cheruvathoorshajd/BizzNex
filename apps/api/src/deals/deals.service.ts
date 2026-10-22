import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { assertLinksOwned } from '../common/ownership';
import { NotificationsService } from '../notifications/notifications.service';
import type { CreateDealInput, UpdateDealInput } from '@bizznex/shared';

/** Won and Lost are end states: a deal there is closed. */
const isClosed = (stage: string) => stage === 'Won' || stage === 'Lost';
const money = (n: number) => '$' + Math.round(n).toLocaleString('en-US');
/** Close dates are calendar dates, stored as UTC midnight like every other date input. */
const today = () => new Date(new Date().toISOString().slice(0, 10));

@Injectable()
export class DealsService {
  constructor(private readonly prisma: PrismaService, private readonly notifications: NotificationsService) {}

  list(userId: string) {
    return this.prisma.deal.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } });
  }

  /**
   * A deal's company must match its contact's company. With no company given, the contact's is used;
   * a different one is rejected. Returns the company id to store.
   */
  private async resolveCompany(userId: string, contactId: string | null, companyId: string | null) {
    await assertLinksOwned(this.prisma, userId, { contactId, companyId });
    if (!contactId) return companyId;
    const contact = await this.prisma.contact.findFirst({ where: { id: contactId, userId }, select: { companyId: true } });
    if (!contact?.companyId) return companyId;
    if (!companyId) return contact.companyId;
    if (companyId !== contact.companyId) {
      throw new BadRequestException('That contact works at a different company. Pick their company, or leave Company empty.');
    }
    return companyId;
  }

  async create(userId: string, dto: CreateDealInput) {
    const contactId = dto.contactId ?? null;
    const companyId = await this.resolveCompany(userId, contactId, dto.companyId ?? null);
    const stage = dto.stage ?? 'Lead';
    return this.prisma.deal.create({
      data: {
        userId,
        title: dto.title,
        value: dto.value ?? 0,
        stage,
        contactId,
        companyId,
        closeDate: dto.closeDate ? new Date(dto.closeDate) : isClosed(stage) ? today() : null,
      },
    });
  }

  private async assertOwned(userId: string, id: string) {
    const deal = await this.prisma.deal.findFirst({ where: { id, userId } });
    if (!deal) throw new NotFoundException('Deal not found');
    return deal;
  }

  async update(userId: string, id: string, dto: UpdateDealInput) {
    const deal = await this.assertOwned(userId, id);
    const links: { contactId?: string | null; companyId?: string | null } = {};
    if (dto.contactId !== undefined || dto.companyId !== undefined) {
      const contactId = dto.contactId !== undefined ? dto.contactId ?? null : deal.contactId;
      links.contactId = contactId;
      links.companyId = await this.resolveCompany(userId, contactId, dto.companyId !== undefined ? dto.companyId ?? null : deal.companyId);
    }

    // closing stamps the close date (unless one is set); reopening clears it
    const stage = dto.stage ?? deal.stage;
    let closeDate: Date | null | undefined = dto.closeDate !== undefined ? (dto.closeDate ? new Date(dto.closeDate) : null) : undefined;
    if (isClosed(stage) && !isClosed(deal.stage) && closeDate === undefined && !deal.closeDate) closeDate = today();
    if (!isClosed(stage) && isClosed(deal.stage)) closeDate = null;
    const wonNow = stage === 'Won' && deal.stage !== 'Won';

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.deal.update({
        where: { id },
        data: {
          ...(dto.title !== undefined ? { title: dto.title } : {}),
          ...(dto.value !== undefined ? { value: dto.value } : {}),
          ...(dto.stage !== undefined ? { stage: dto.stage } : {}),
          ...links,
          ...(closeDate !== undefined ? { closeDate } : {}),
        },
      });
      if (wonNow) await this.notifications.notify(userId, 'deal', `Deal won: ${updated.title} (${money(updated.value)})`, tx);
      return updated;
    });
  }

  async remove(userId: string, id: string) {
    await this.assertOwned(userId, id);
    await this.prisma.deal.delete({ where: { id } });
    return { ok: true };
  }
}
