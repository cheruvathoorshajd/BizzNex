import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../common/current-user.decorator';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { createActivitySchema, updateActivitySchema } from '@bizznex/shared';
import type { CreateActivityInput, UpdateActivityInput } from '@bizznex/shared';
import { ActivitiesService } from './activities.service';

@ApiTags('activities')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('activities')
export class ActivitiesController {
  constructor(private readonly activities: ActivitiesService) {}

  @Get()
  list(@CurrentUser() userId: string) {
    return this.activities.list(userId);
  }

  @Post()
  create(@CurrentUser() userId: string, @Body(new ZodValidationPipe(createActivitySchema)) body: CreateActivityInput) {
    return this.activities.create(userId, body);
  }

  @Patch(':id')
  update(
    @CurrentUser() userId: string,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateActivitySchema)) body: UpdateActivityInput,
  ) {
    return this.activities.update(userId, id, body);
  }

  @Delete(':id')
  remove(@CurrentUser() userId: string, @Param('id') id: string) {
    return this.activities.remove(userId, id);
  }
}
