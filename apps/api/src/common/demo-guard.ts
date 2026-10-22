import { ForbiddenException } from '@nestjs/common';
import { DEMO_EMAIL } from '@bizznex/shared';

export const DEMO_LOCKED = 'The demo workspace is shared by everyone, so its account settings can’t be changed. Create your own account to edit them.';

/** Every visitor shares the demo account, so nobody may change it for everyone else. */
export function guardDemo(u: { email: string }, message = DEMO_LOCKED) {
  if (u.email === DEMO_EMAIL) throw new ForbiddenException(message);
}
