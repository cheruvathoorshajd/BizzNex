import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../common/current-user.decorator';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { createCompanySchema, updateCompanySchema } from '@bizznex/shared';
import type { CreateCompanyInput, UpdateCompanyInput } from '@bizznex/shared';
import { CompaniesService } from './companies.service';

@ApiTags('companies')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('companies')
export class CompaniesController {
  constructor(private readonly companies: CompaniesService) {}

  @Get()
  list(@CurrentUser() userId: string) {
    return this.companies.list(userId);
  }

  @Post()
  create(@CurrentUser() userId: string, @Body(new ZodValidationPipe(createCompanySchema)) body: CreateCompanyInput) {
    return this.companies.create(userId, body);
  }

  @Patch(':id')
  update(
    @CurrentUser() userId: string,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateCompanySchema)) body: UpdateCompanyInput,
  ) {
    return this.companies.update(userId, id, body);
  }

  @Delete(':id')
  remove(@CurrentUser() userId: string, @Param('id') id: string) {
    return this.companies.remove(userId, id);
  }
}
