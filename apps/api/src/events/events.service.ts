import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateEventInput, UpdateEventInput } from '@bizznex/shared';

@Injectable()
export class EventsService {
  constructor(private readonly prisma: PrismaService) {}

  list(userId: string) {
    return this.prisma.event.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } });
  }

  create(userId: string, dto: CreateEventInput) {
    return this.prisma.event.create({
      data: {
        userId,
        name: dto.name,
        category: dto.category ?? 'General',
        location: dto.location ?? '',
        startsAt: dto.startsAt ? new Date(dto.startsAt) : null,
      },
    });
  }

  private async assertOwned(userId: string, id: string) {
    const event = await this.prisma.event.findFirst({ where: { id, userId } });
    if (!event) throw new NotFoundException('Event not found');
    return event;
  }

  async update(userId: string, id: string, dto: UpdateEventInput) {
    await this.assertOwned(userId, id);
    return this.prisma.event.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.category !== undefined ? { category: dto.category } : {}),
        ...(dto.location !== undefined ? { location: dto.location } : {}),
        ...(dto.startsAt !== undefined ? { startsAt: dto.startsAt ? new Date(dto.startsAt) : null } : {}),
      },
    });
  }

  async remove(userId: string, id: string) {
    await this.assertOwned(userId, id);
    await this.prisma.event.delete({ where: { id } });
    return { ok: true };
  }
}
