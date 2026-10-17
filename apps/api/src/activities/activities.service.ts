import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { assertLinksOwned } from '../common/ownership';
import type { CreateActivityInput, UpdateActivityInput } from '@bizznex/shared';

@Injectable()
export class ActivitiesService {
  constructor(private readonly prisma: PrismaService) {}

  list(userId: string) {
    return this.prisma.activity.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } });
  }

  async create(userId: string, dto: CreateActivityInput) {
    await assertLinksOwned(this.prisma, userId, { contactId: dto.contactId, dealId: dto.dealId });
    return this.prisma.activity.create({
      data: {
        userId,
        type: dto.type ?? 'Note',
        subject: dto.subject,
        notes: dto.notes ?? '',
        dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
        done: dto.done ?? false,
        contactId: dto.contactId ?? null,
        dealId: dto.dealId ?? null,
      },
    });
  }

  private async assertOwned(userId: string, id: string) {
    const activity = await this.prisma.activity.findFirst({ where: { id, userId } });
    if (!activity) throw new NotFoundException('Activity not found');
    return activity;
  }

  async update(userId: string, id: string, dto: UpdateActivityInput) {
    await this.assertOwned(userId, id);
    await assertLinksOwned(this.prisma, userId, { contactId: dto.contactId, dealId: dto.dealId });
    return this.prisma.activity.update({
      where: { id },
      data: {
        ...(dto.type !== undefined ? { type: dto.type } : {}),
        ...(dto.subject !== undefined ? { subject: dto.subject } : {}),
        ...(dto.notes !== undefined ? { notes: dto.notes } : {}),
        ...(dto.dueDate !== undefined ? { dueDate: dto.dueDate ? new Date(dto.dueDate) : null } : {}),
        ...(dto.done !== undefined ? { done: dto.done } : {}),
        ...(dto.contactId !== undefined ? { contactId: dto.contactId ?? null } : {}),
        ...(dto.dealId !== undefined ? { dealId: dto.dealId ?? null } : {}),
      },
    });
  }

  async remove(userId: string, id: string) {
    await this.assertOwned(userId, id);
    await this.prisma.activity.delete({ where: { id } });
    return { ok: true };
  }
}
