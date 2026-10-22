import { Body, Controller, Delete, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../common/current-user.decorator';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { createTaskSchema, updateTaskSchema } from '@bizznex/shared';
import type { CreateTaskInput, UpdateTaskInput } from '@bizznex/shared';
import { TasksService } from './tasks.service';

@ApiTags('tasks')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class TasksController {
  constructor(private readonly tasks: TasksService) {}

  @Post('projects/:projectId/tasks')
  add(
    @CurrentUser() userId: string,
    @Param('projectId') projectId: string,
    @Body(new ZodValidationPipe(createTaskSchema)) body: CreateTaskInput,
  ) {
    return this.tasks.add(userId, projectId, body);
  }

  @Patch('projects/:projectId/tasks/:taskId')
  update(
    @CurrentUser() userId: string,
    @Param('projectId') projectId: string,
    @Param('taskId') taskId: string,
    @Body(new ZodValidationPipe(updateTaskSchema)) body: UpdateTaskInput,
  ) {
    return this.tasks.update(userId, projectId, taskId, body);
  }

  @Delete('projects/:projectId/tasks/:taskId')
  remove(
    @CurrentUser() userId: string,
    @Param('projectId') projectId: string,
    @Param('taskId') taskId: string,
  ) {
    return this.tasks.remove(userId, projectId, taskId);
  }
}
