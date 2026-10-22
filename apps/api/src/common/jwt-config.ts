import type { ConfigService } from '@nestjs/config';
import type { JwtModuleOptions } from '@nestjs/jwt';

const DEV_SECRET = 'bizznex-dev-only-secret';

/** One place for the signing secret: a real secret is mandatory outside development. */
export function jwtSecret(config: ConfigService): string {
  const secret = config.get<string>('JWT_SECRET');
  if (config.get<string>('NODE_ENV') === 'production') {
    if (!secret) throw new Error('JWT_SECRET must be set in production.');
    if (secret.length < 32 || /change-me/i.test(secret)) {
      throw new Error('JWT_SECRET is too weak for production: use a random value of at least 32 characters (for example `openssl rand -hex 32`), not the example placeholder.');
    }
    return secret;
  }
  return secret || DEV_SECRET;
}

export function jwtOptions(config: ConfigService): JwtModuleOptions {
  return {
    secret: jwtSecret(config),
    signOptions: { expiresIn: config.get<string>('JWT_EXPIRES_IN') || '7d' },
  };
}

/** Claims carried by every token. `v` is the user's token version: bumping it signs every session out. */
export interface JwtPayload {
  sub: string;
  email: string;
  v?: number;
}

export const tokenPayload = (u: { id: string; email: string; tokenVersion: number }): JwtPayload =>
  ({ sub: u.id, email: u.email, v: u.tokenVersion });
