import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { CreatePostInput, UpdatePostInput } from '@bizznex/shared';

@Injectable()
export class PostsService {
  constructor(private readonly prisma: PrismaService) {}

  list(userId: string) {
    return this.prisma.post.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } });
  }

  create(userId: string, dto: CreatePostInput) {
    return this.prisma.post.create({
      data: {
        userId,
        title: dto.title,
        body: dto.body ?? '',
        platforms: dto.platforms ?? [],
        status: dto.status ?? 'draft',
        publishedAt: dto.status === 'published' ? new Date() : null,
      },
    });
  }

  private async assertOwned(userId: string, id: string) {
    const post = await this.prisma.post.findFirst({ where: { id, userId } });
    if (!post) throw new NotFoundException('Post not found');
    return post;
  }

  async update(userId: string, id: string, dto: UpdatePostInput) {
    await this.assertOwned(userId, id);
    return this.prisma.post.update({
      where: { id },
      data: {
        ...(dto.title !== undefined ? { title: dto.title } : {}),
        ...(dto.body !== undefined ? { body: dto.body } : {}),
        ...(dto.platforms !== undefined ? { platforms: dto.platforms } : {}),
        ...(dto.status !== undefined ? { status: dto.status } : {}),
        ...(dto.publishedAt !== undefined ? { publishedAt: dto.publishedAt ? new Date(dto.publishedAt) : null } : {}),
      },
    });
  }

  async remove(userId: string, id: string) {
    await this.assertOwned(userId, id);
    await this.prisma.post.delete({ where: { id } });
    return { ok: true };
  }
}
