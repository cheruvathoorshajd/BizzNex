import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TASK_DATES_MESSAGE, taskDatesInOrder } from '@bizznex/shared';
import type { CreateTaskInput, UpdateTaskInput } from '@bizznex/shared';

@Injectable()
export class TasksService {
  constructor(private readonly prisma: PrismaService) {}

  private async assertProject(userId: string, projectId: string) {
    const project = await this.prisma.project.findFirst({ where: { id: projectId, userId } });
    if (!project) throw new NotFoundException('Project not found');
  }

  async add(userId: string, projectId: string, dto: CreateTaskInput) {
    await this.assertProject(userId, projectId);
    return this.prisma.task.create({
      data: {
        projectId,
        name: dto.name,
        description: dto.description ?? '',
        startDate: dto.startDate ? new Date(dto.startDate) : null,
        endDate: dto.endDate ? new Date(dto.endDate) : null,
        status: dto.status ?? 'Pending',
      },
    });
  }

  async update(userId: string, projectId: string, taskId: string, dto: UpdateTaskInput) {
    await this.assertProject(userId, projectId);
    const task = await this.prisma.task.findFirst({ where: { id: taskId, projectId } });
    if (!task) throw new NotFoundException('Task not found');
    // a partial update can move one date past the other, so check the merged result
    const startDate = dto.startDate !== undefined ? dto.startDate : task.startDate?.toISOString() ?? null;
    const endDate = dto.endDate !== undefined ? dto.endDate : task.endDate?.toISOString() ?? null;
    if (!taskDatesInOrder({ startDate, endDate })) throw new BadRequestException(TASK_DATES_MESSAGE);
    return this.prisma.task.update({
      where: { id: taskId },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.description !== undefined ? { description: dto.description } : {}),
        ...(dto.status !== undefined ? { status: dto.status } : {}),
        ...(dto.startDate !== undefined ? { startDate: dto.startDate ? new Date(dto.startDate) : null } : {}),
        ...(dto.endDate !== undefined ? { endDate: dto.endDate ? new Date(dto.endDate) : null } : {}),
      },
    });
  }

  async remove(userId: string, projectId: string, taskId: string) {
    await this.assertProject(userId, projectId);
    const task = await this.prisma.task.findFirst({ where: { id: taskId, projectId } });
    if (!task) throw new NotFoundException('Task not found');
    await this.prisma.task.delete({ where: { id: taskId } });
    return { ok: true };
  }
}
