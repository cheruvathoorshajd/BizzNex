import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { resetDemoWorkspace } from './demo-workspace';

/**
 * The demo account is shared by every visitor, so anything one visitor deletes would be gone for the next.
 * Instead of locking it, the workspace resets itself on the first demo sign-in after it has gone stale.
 */
@Injectable()
export class DemoService {
  private readonly logger = new Logger('Demo');
  private readonly maxAgeMs: number;
  private lastReset = 0;
  private inFlight: Promise<void> | null = null;

  constructor(private readonly prisma: PrismaService, config: ConfigService) {
    this.maxAgeMs = Number(config.get('DEMO_RESET_MINUTES') ?? 30) * 60_000;
  }

  /** Concurrent demo sign-ins share one reset instead of racing each other. */
  resetIfStale(now = Date.now()): Promise<void> {
    if (now - this.lastReset < this.maxAgeMs) return Promise.resolve();
    this.inFlight ??= resetDemoWorkspace(this.prisma)
      .then(() => { this.lastReset = Date.now(); this.logger.log('Demo workspace reset'); })
      .finally(() => { this.inFlight = null; });
    return this.inFlight;
  }
}
