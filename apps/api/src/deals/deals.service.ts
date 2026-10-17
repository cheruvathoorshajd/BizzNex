import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { assertLinksOwned } from '../common/ownership';
import type { CreateDealInput, UpdateDealInput } from '@bizznex/shared';

@Injectable()
export class DealsService {
  constructor(private readonly prisma: PrismaService) {}

  list(userId: string) {
    return this.prisma.deal.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } });
  }

  async create(userId: string, dto: CreateDealInput) {
    await assertLinksOwned(this.prisma, userId, { contactId: dto.contactId, companyId: dto.companyId });
    return this.prisma.deal.create({
      data: {
        userId,
        title: dto.title,
        value: dto.value ?? 0,
        stage: dto.stage ?? 'Lead',
        contactId: dto.contactId ?? null,
        companyId: dto.companyId ?? null,
        closeDate: dto.closeDate ? new Date(dto.closeDate) : null,
      },
    });
  }

  private async assertOwned(userId: string, id: string) {
    const deal = await this.prisma.deal.findFirst({ where: { id, userId } });
    if (!deal) throw new NotFoundException('Deal not found');
    return deal;
  }

  async update(userId: string, id: string, dto: UpdateDealInput) {
    await this.assertOwned(userId, id);
    await assertLinksOwned(this.prisma, userId, { contactId: dto.contactId, companyId: dto.companyId });
    return this.prisma.deal.update({
      where: { id },
      data: {
        ...(dto.title !== undefined ? { title: dto.title } : {}),
        ...(dto.value !== undefined ? { value: dto.value } : {}),
        ...(dto.stage !== undefined ? { stage: dto.stage } : {}),
        ...(dto.contactId !== undefined ? { contactId: dto.contactId ?? null } : {}),
        ...(dto.companyId !== undefined ? { companyId: dto.companyId ?? null } : {}),
        ...(dto.closeDate !== undefined ? { closeDate: dto.closeDate ? new Date(dto.closeDate) : null } : {}),
      },
    });
  }

  async remove(userId: string, id: string) {
    await this.assertOwned(userId, id);
    await this.prisma.deal.delete({ where: { id } });
    return { ok: true };
  }
}
