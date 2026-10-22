import { Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { UpdateNotificationInput, UserPreferences } from '@bizznex/shared';

/** What a notification is about. Matches the `kind` column. */
export type NotificationKind = 'deal' | 'campaign' | 'post' | 'task' | 'event' | 'system';

/** Kinds the user can switch off in Settings → Notifications, and the preference key that controls each. */
const PREFERENCE_KEY: Partial<Record<NotificationKind, keyof NonNullable<UserPreferences['notifications']>>> = {
  deal: 'dealWon',
};

/** Either the Prisma client or an interactive transaction client. */
type Db = Prisma.TransactionClient | PrismaService;

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  list(userId: string) {
    return this.prisma.notification.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } });
  }

  /**
   * Adds a notification for something that happened on the server (a campaign sent, a post
   * published, a deal won). Pass `tx` to make it part of the same transaction as the change.
   * Kinds with a Settings toggle are skipped when the user turned that toggle off.
   * Returns the notification, or null when it was skipped.
   */
  async notify(userId: string, kind: NotificationKind, message: string, tx?: Db) {
    const db = tx ?? this.prisma;
    const key = PREFERENCE_KEY[kind];
    if (key) {
      const user = await db.user.findUnique({ where: { id: userId }, select: { preferences: true } });
      const prefs = (user?.preferences ?? {}) as UserPreferences;
      if (prefs.notifications?.[key] === false) return null;
    }
    return db.notification.create({ data: { userId, kind, message: message.slice(0, 500) } });
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
