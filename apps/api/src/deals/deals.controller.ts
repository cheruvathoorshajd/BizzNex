import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../common/current-user.decorator';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { createDealSchema, updateDealSchema } from '@bizznex/shared';
import type { CreateDealInput, UpdateDealInput } from '@bizznex/shared';
import { DealsService } from './deals.service';

@ApiTags('deals')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('deals')
export class DealsController {
  constructor(private readonly deals: DealsService) {}

  @Get()
  list(@CurrentUser() userId: string) {
    return this.deals.list(userId);
  }

  @Post()
  create(@CurrentUser() userId: string, @Body(new ZodValidationPipe(createDealSchema)) body: CreateDealInput) {
    return this.deals.create(userId, body);
  }

  @Patch(':id')
  update(
    @CurrentUser() userId: string,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateDealSchema)) body: UpdateDealInput,
  ) {
    return this.deals.update(userId, id, body);
  }

  @Delete(':id')
  remove(@CurrentUser() userId: string, @Param('id') id: string) {
    return this.deals.remove(userId, id);
  }
}
