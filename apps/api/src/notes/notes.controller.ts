import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../common/current-user.decorator';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { createNoteSchema, updateNoteSchema } from '@bizznex/shared';
import type { CreateNoteInput, UpdateNoteInput } from '@bizznex/shared';
import { NotesService } from './notes.service';

@ApiTags('notes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('notes')
export class NotesController {
  constructor(private readonly notes: NotesService) {}

  @Get()
  list(@CurrentUser() userId: string) {
    return this.notes.list(userId);
  }

  @Post()
  create(@CurrentUser() userId: string, @Body(new ZodValidationPipe(createNoteSchema)) body: CreateNoteInput) {
    return this.notes.create(userId, body);
  }

  @Patch(':id')
  update(
    @CurrentUser() userId: string,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateNoteSchema)) body: UpdateNoteInput,
  ) {
    return this.notes.update(userId, id, body);
  }

  @Delete(':id')
  remove(@CurrentUser() userId: string, @Param('id') id: string) {
    return this.notes.remove(userId, id);
  }
}
