import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { postBodyLimit } from '@bizznex/shared';
import type { CreatePostInput, UpdatePostInput } from '@bizznex/shared';

const publishedMessage = (platforms: string[]) =>
  platforms.length ? `Post published to ${platforms.join(', ')}` : 'Post published';

@Injectable()
export class PostsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  list(userId: string) {
    return this.prisma.post.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } });
  }

  /** A post going to X (Twitter) must fit its 280 characters. */
  private assertFits(body: string, platforms: string[]) {
    const max = postBodyLimit(platforms);
    if (body.length > max) throw new BadRequestException(`Keep the description to ${max} characters for ${platforms.join(', ')}.`);
  }

  async create(userId: string, dto: CreatePostInput) {
    const body = dto.body ?? '';
    const platforms = dto.platforms ?? [];
    this.assertFits(body, platforms);
    const status = dto.status ?? 'draft';
    const data = { userId, title: dto.title, body, platforms, status };
    if (status !== 'published') return this.prisma.post.create({ data });
    return this.prisma.$transaction(async (tx) => {
      const post = await tx.post.create({ data: { ...data, publishedAt: new Date() } });
      await this.notifications.notify(userId, 'post', publishedMessage(platforms), tx);
      return post;
    });
  }

  private async assertOwned(userId: string, id: string) {
    const post = await this.prisma.post.findFirst({ where: { id, userId } });
    if (!post) throw new NotFoundException('Post not found');
    return post;
  }

  async update(userId: string, id: string, dto: UpdatePostInput) {
    const current = await this.assertOwned(userId, id);
    const platforms = dto.platforms ?? current.platforms;
    this.assertFits(dto.body ?? current.body, platforms);
    const data = {
      ...(dto.title !== undefined ? { title: dto.title } : {}),
      ...(dto.body !== undefined ? { body: dto.body } : {}),
      ...(dto.platforms !== undefined ? { platforms: dto.platforms } : {}),
      ...(dto.status !== undefined ? { status: dto.status } : {}),
      // publishedAt is the server's call: set on publish, cleared when moved back to draft.
      ...(dto.status === 'draft' ? { publishedAt: null } : {}),
    };
    if (dto.status !== 'published' || current.status === 'published') return this.prisma.post.update({ where: { id }, data });
    return this.prisma.$transaction(async (tx) => {
      const post = await tx.post.update({ where: { id }, data: { ...data, publishedAt: new Date() } });
      await this.notifications.notify(userId, 'post', publishedMessage(platforms), tx);
      return post;
    });
  }

  async remove(userId: string, id: string) {
    await this.assertOwned(userId, id);
    await this.prisma.post.delete({ where: { id } });
    return { ok: true };
  }
}
