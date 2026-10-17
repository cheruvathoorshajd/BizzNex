import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateCampaignInput, UpdateCampaignInput } from '@bizznex/shared';

@Injectable()
export class CampaignsService {
  constructor(private readonly prisma: PrismaService) {}

  list(userId: string) {
    return this.prisma.campaign.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } });
  }

  /** Delivery is simulated, but the count is real: every contact you have an email address for. */
  private recipients(userId: string) {
    return this.prisma.contact.count({ where: { userId, NOT: { email: '' } } });
  }

  async create(userId: string, dto: CreateCampaignInput) {
    const status = dto.status ?? 'draft';
    const scheduledAt = dto.scheduledAt ? new Date(dto.scheduledAt) : null;
    if (status === 'scheduled' && (!scheduledAt || scheduledAt.getTime() <= Date.now())) {
      throw new BadRequestException('Pick a time in the future to schedule this campaign.');
    }
    return this.prisma.campaign.create({
      data: {
        userId,
        title: dto.title,
        subject: dto.subject ?? '',
        content: dto.content ?? '',
        audience: dto.audience ?? 'All subscribers',
        status,
        scheduledAt: status === 'scheduled' ? scheduledAt : null,
        ...(status === 'sent' ? { sentAt: new Date(), recipients: await this.recipients(userId) } : {}),
      },
    });
  }

  private async assertOwned(userId: string, id: string) {
    const campaign = await this.prisma.campaign.findFirst({ where: { id, userId } });
    if (!campaign) throw new NotFoundException('Campaign not found');
    return campaign;
  }

  async update(userId: string, id: string, dto: UpdateCampaignInput) {
    await this.assertOwned(userId, id);
    return this.prisma.campaign.update({
      where: { id },
      data: {
        ...(dto.title !== undefined ? { title: dto.title } : {}),
        ...(dto.subject !== undefined ? { subject: dto.subject } : {}),
        ...(dto.content !== undefined ? { content: dto.content } : {}),
        ...(dto.audience !== undefined ? { audience: dto.audience } : {}),
        ...(dto.status !== undefined ? { status: dto.status } : {}),
        ...(dto.recipients !== undefined ? { recipients: dto.recipients } : {}),
        ...(dto.scheduledAt !== undefined ? { scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : null } : {}),
        ...(dto.sentAt !== undefined ? { sentAt: dto.sentAt ? new Date(dto.sentAt) : null } : {}),
      },
    });
  }

  async remove(userId: string, id: string) {
    await this.assertOwned(userId, id);
    await this.prisma.campaign.delete({ where: { id } });
    return { ok: true };
  }
}
