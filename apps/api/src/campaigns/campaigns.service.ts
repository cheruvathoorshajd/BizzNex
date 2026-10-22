import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import type { CreateCampaignInput, UpdateCampaignInput } from '@bizznex/shared';

const sentMessage = (c: { subject: string; title: string }, recipients: number) =>
  `Campaign sent: ${c.subject || c.title} to ${recipients} recipient${recipients === 1 ? '' : 's'}`;

@Injectable()
export class CampaignsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  async list(userId: string) {
    await this.deliverDue(userId);
    return this.prisma.campaign.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } });
  }

  /** Delivery is simulated, but the count is real: every contact you have an email address for. */
  private recipients(userId: string, db: Prisma.TransactionClient | PrismaService = this.prisma) {
    return db.contact.count({ where: { userId, NOT: { email: '' } } });
  }

  /**
   * Sends scheduled campaigns whose time has come. This runs when campaigns are read, not on a
   * timer: BizzNex has no background worker or cron process, and since delivery is simulated, the
   * first read after `scheduledAt` is indistinguishable from a send at that moment (sentAt is set to
   * scheduledAt). Each row is flipped with a status-guarded updateMany, so concurrent reads can't
   * send — or notify about — the same campaign twice.
   */
  private async deliverDue(userId: string) {
    const due = await this.prisma.campaign.findMany({
      where: { userId, status: 'scheduled', scheduledAt: { lte: new Date() } },
      select: { id: true, title: true, subject: true, scheduledAt: true },
    });
    if (!due.length) return;
    await this.prisma.$transaction(async (tx) => {
      const recipients = await this.recipients(userId, tx);
      for (const c of due) {
        const { count } = await tx.campaign.updateMany({
          where: { id: c.id, status: 'scheduled' },
          data: { status: 'sent', sentAt: c.scheduledAt, recipients },
        });
        if (count) await this.notifications.notify(userId, 'campaign', sentMessage(c, recipients), tx);
      }
    });
  }

  private assertFuture(scheduledAt: Date | null) {
    if (!scheduledAt || scheduledAt.getTime() <= Date.now()) {
      throw new BadRequestException('Pick a time in the future to schedule this campaign.');
    }
  }

  async create(userId: string, dto: CreateCampaignInput) {
    const status = dto.status ?? 'draft';
    const scheduledAt = dto.scheduledAt ? new Date(dto.scheduledAt) : null;
    if (status === 'scheduled') this.assertFuture(scheduledAt);
    const data = {
      userId,
      title: dto.title,
      subject: dto.subject ?? '',
      content: dto.content ?? '',
      status,
      scheduledAt: status === 'scheduled' ? scheduledAt : null,
    };
    if (status !== 'sent') return this.prisma.campaign.create({ data });
    return this.prisma.$transaction(async (tx) => {
      const recipients = await this.recipients(userId, tx);
      const campaign = await tx.campaign.create({ data: { ...data, sentAt: new Date(), recipients } });
      await this.notifications.notify(userId, 'campaign', sentMessage(campaign, recipients), tx);
      return campaign;
    });
  }

  private async assertOwned(userId: string, id: string) {
    const campaign = await this.prisma.campaign.findFirst({ where: { id, userId } });
    if (!campaign) throw new NotFoundException('Campaign not found');
    return campaign;
  }

  async update(userId: string, id: string, dto: UpdateCampaignInput) {
    await this.deliverDue(userId);
    const current = await this.assertOwned(userId, id);
    const status = dto.status ?? current.status;
    if (current.status === 'sent' && status !== 'sent') {
      throw new BadRequestException('This campaign has already been sent.');
    }
    const scheduledAt = dto.scheduledAt !== undefined ? (dto.scheduledAt ? new Date(dto.scheduledAt) : null) : current.scheduledAt;
    // Same rule as create: scheduling (or rescheduling) needs a time in the future.
    if (status === 'scheduled' && (dto.status !== undefined || dto.scheduledAt !== undefined)) this.assertFuture(scheduledAt);
    const data = {
      ...(dto.title !== undefined ? { title: dto.title } : {}),
      ...(dto.subject !== undefined ? { subject: dto.subject } : {}),
      ...(dto.content !== undefined ? { content: dto.content } : {}),
      status,
      ...(status !== 'sent' ? { scheduledAt: status === 'scheduled' ? scheduledAt : null } : {}),
    };
    if (status !== 'sent' || current.status === 'sent') return this.prisma.campaign.update({ where: { id }, data });
    // Sending now: the server sets sentAt and counts recipients, never the client.
    return this.prisma.$transaction(async (tx) => {
      const recipients = await this.recipients(userId, tx);
      const campaign = await tx.campaign.update({ where: { id }, data: { ...data, sentAt: new Date(), recipients } });
      await this.notifications.notify(userId, 'campaign', sentMessage(campaign, recipients), tx);
      return campaign;
    });
  }

  async remove(userId: string, id: string) {
    await this.assertOwned(userId, id);
    await this.prisma.campaign.delete({ where: { id } });
    return { ok: true };
  }
}
