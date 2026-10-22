import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { resetDemoWorkspace } from './demo-workspace';

/**
 * The demo account is shared by every visitor, so anything one visitor deletes would be gone for the next.
 * Instead of locking it, the workspace resets itself on the first demo sign-in after it has gone stale.
 * The reset time lives in the database (see resetDemoWorkspace), so several API instances agree on it,
 * and a reset signs out the demo sessions that were open on the old data.
 */
@Injectable()
export class DemoService {
  private readonly logger = new Logger('Demo');
  private readonly maxAgeMs: number;
  /** The last reset this instance knows of: a shortcut that saves a DB round trip while it is clearly fresh. */
  private knownResetAt = 0;
  private inFlight: Promise<void> | null = null;

  constructor(private readonly prisma: PrismaService, config: ConfigService) {
    this.maxAgeMs = Number(config.get('DEMO_RESET_MINUTES') ?? 30) * 60_000;
  }

  /** Concurrent demo sign-ins on this instance share one check; other instances wait on the DB lock. */
  resetIfStale(now = Date.now()): Promise<void> {
    if (now - this.knownResetAt < this.maxAgeMs) return Promise.resolve();
    this.inFlight ??= resetDemoWorkspace(this.prisma, this.maxAgeMs)
      .then(({ reset, resetAt }) => {
        this.knownResetAt = resetAt.getTime();
        if (reset) this.logger.log('Demo workspace reset');
      })
      .finally(() => { this.inFlight = null; });
    return this.inFlight;
  }
}
