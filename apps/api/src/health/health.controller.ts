import { Controller, Get, Req, Res } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
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

  /**
   * Liveness only: never touches the database, so a keep-awake pinger doesn't keep a
   * scale-to-zero database (Neon) awake too. `ip` is the caller's address as the API sees it;
   * if it is a private proxy address instead of your own, TRUST_PROXY is too low and every
   * visitor shares one rate limit.
   */
  @Get('live')
  live(@Req() req: Request) {
    return { status: 'ok', ip: req.ip, timestamp: new Date().toISOString() };
  }
}
