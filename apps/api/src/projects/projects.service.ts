import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateProjectInput, UpdateProjectInput } from '@bizznex/shared';

const includeTasks = { tasks: { orderBy: { createdAt: 'asc' as const } } };

@Injectable()
export class ProjectsService {
  constructor(private readonly prisma: PrismaService) {}

  list(userId: string) {
    return this.prisma.project.findMany({ where: { userId }, include: includeTasks, orderBy: { createdAt: 'desc' } });
  }

  async get(userId: string, id: string) {
    const project = await this.prisma.project.findFirst({ where: { id, userId }, include: includeTasks });
    if (!project) throw new NotFoundException('Project not found');
    return project;
  }

  create(userId: string, dto: CreateProjectInput) {
    return this.prisma.project.create({
      data: {
        userId,
        name: dto.name,
        owner: dto.owner ?? 'You',
        spend: dto.spend ?? 0,
        // monthly spend history; a new project has none yet rather than an invented one
        trend: dto.trend ?? [],
      },
      include: includeTasks,
    });
  }

  async update(userId: string, id: string, dto: UpdateProjectInput) {
    await this.get(userId, id);
    return this.prisma.project.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.owner !== undefined ? { owner: dto.owner } : {}),
        ...(dto.spend !== undefined ? { spend: dto.spend } : {}),
        ...(dto.trend !== undefined ? { trend: dto.trend } : {}),
      },
      include: includeTasks,
    });
  }

  async remove(userId: string, id: string) {
    await this.get(userId, id);
    await this.prisma.project.delete({ where: { id } });
    return { ok: true };
  }
}
