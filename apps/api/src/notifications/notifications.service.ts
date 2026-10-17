import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateNotificationInput, UpdateNotificationInput } from '@bizznex/shared';

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  list(userId: string) {
    return this.prisma.notification.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } });
  }

  create(userId: string, dto: CreateNotificationInput) {
    return this.prisma.notification.create({
      data: {
        userId,
        kind: dto.kind ?? 'system',
        message: dto.message,
      },
    });
  }

  private async assertOwned(userId: string, id: string) {
    const notification = await this.prisma.notification.findFirst({ where: { id, userId } });
    if (!notification) throw new NotFoundException('Notification not found');
    return notification;
  }

  async update(userId: string, id: string, dto: UpdateNotificationInput) {
    await this.assertOwned(userId, id);
    return this.prisma.notification.update({
      where: { id },
      data: {
        ...(dto.read !== undefined ? { read: dto.read } : {}),
      },
    });
  }

  async remove(userId: string, id: string) {
    await this.assertOwned(userId, id);
    await this.prisma.notification.delete({ where: { id } });
    return { ok: true };
  }
}
