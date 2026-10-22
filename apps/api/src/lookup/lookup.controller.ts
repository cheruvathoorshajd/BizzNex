import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { LookupService } from './lookup.service';

@ApiTags('lookup')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('lookup')
export class LookupController {
  constructor(private readonly lookup: LookupService) {}

  /** Search public company data by name, for filling in the business profile. */
  @Throttle({ default: { limit: 40, ttl: 60_000 } })
  @ApiQuery({ name: 'q', description: 'Company name (2+ characters)' })
  @Get('companies')
  companies(@Query('q') q = '') {
    return this.lookup.companies(String(q).slice(0, 80));
  }
}
