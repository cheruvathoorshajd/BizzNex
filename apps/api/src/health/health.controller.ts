import { Controller, Get, Res } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import type { Response } from 'express';
import { PrismaService } from '../prisma/prisma.service';

@ApiTags('health')
@SkipThrottle() // probes poll this; they must never be rate limited
@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  /** 200 when the database answers, 503 (same body shape) when it doesn't, so orchestrators can act on it. */
  @Get()
  async check(@Res({ passthrough: true }) res: Response) {
    let db = 'up';
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      db = 'down';
    }
    if (db === 'down') res.status(503);
    return { status: db === 'up' ? 'ok' : 'error', db, timestamp: new Date().toISOString() };
  }
}
