import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { jwtSecret } from '../common/jwt-config';
import type { JwtPayload } from '../common/jwt-config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService, private readonly prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: jwtSecret(config),
    });
  }

  /** A valid signature isn't enough: the account must still exist and the token must be current. */
  async validate(payload: JwtPayload) {
    const u = await this.prisma.user.findUnique({ where: { id: payload.sub }, select: { id: true, email: true, tokenVersion: true } });
    if (!u || (payload.v ?? 0) !== u.tokenVersion) throw new UnauthorizedException('Your session has ended. Please sign in again.');
    return { id: u.id, email: u.email };
  }
}
