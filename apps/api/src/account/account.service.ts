import { ConflictException, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { Prisma } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { DEMO_EMAIL } from '@bizznex/shared';
import type { AuthResponse, ChangePasswordInput, UpdatePreferencesInput, UpdateProfileInput, User, UserPreferences } from '@bizznex/shared';
import { PrismaService } from '../prisma/prisma.service';
import { toUser } from '../users/users.service';
import { tokenPayload } from '../common/jwt-config';

const DEMO_LOCKED = 'The demo workspace is shared by everyone, so its account settings can’t be changed. Create your own account to edit them.';

@Injectable()
export class AccountService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  private async load(userId: string) {
    const u = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!u) throw new UnauthorizedException();
    return u;
  }

  /** Every visitor shares the demo account, so nobody may change it for everyone else. */
  private guardDemo(u: { email: string }) {
    if (u.email === DEMO_EMAIL) throw new ForbiddenException(DEMO_LOCKED);
  }

  async updateProfile(userId: string, input: UpdateProfileInput): Promise<AuthResponse> {
    const u = await this.load(userId);
    this.guardDemo(u);
    const email = input.email?.toLowerCase();
    if (email && email !== u.email) {
      const taken = await this.prisma.user.findUnique({ where: { email } });
      if (taken) throw new ConflictException('Another account already uses this email.');
    }
    const next = await this.prisma.user.update({
      where: { id: userId },
      data: { ...(input.name !== undefined && { name: input.name }), ...(email && { email }) },
    });
    // the email is part of the token, so hand back a fresh one
    return { token: this.jwt.sign(tokenPayload(next)), user: toUser(next) };
  }

  async updatePreferences(userId: string, input: UpdatePreferencesInput): Promise<User> {
    const u = await this.load(userId);
    this.guardDemo(u);
    const cur = toUser(u).preferences;
    const next: UserPreferences = {
      ...cur,
      ...(input.startPage && { startPage: input.startPage }),
      ...(input.notifications && { notifications: { ...cur.notifications, ...input.notifications } }),
    };
    const saved = await this.prisma.user.update({ where: { id: userId }, data: { preferences: next as unknown as Prisma.InputJsonValue } });
    return toUser(saved);
  }

  /** Signs every other session out (token version bump) and hands this session a fresh token. */
  async changePassword(userId: string, input: ChangePasswordInput): Promise<AuthResponse> {
    const u = await this.load(userId);
    this.guardDemo(u);
    if (!(await bcrypt.compare(input.currentPassword, u.password))) throw new UnauthorizedException('Your current password is incorrect.');
    if (input.currentPassword === input.newPassword) throw new ConflictException('Choose a password you haven’t used for this account.');
    const next = await this.prisma.user.update({
      where: { id: userId },
      data: { password: await bcrypt.hash(input.newPassword, 10), tokenVersion: { increment: 1 } },
    });
    return { token: this.jwt.sign(tokenPayload(next)), user: toUser(next) };
  }

  async deleteAccount(userId: string, password: string): Promise<{ ok: true }> {
    const u = await this.load(userId);
    this.guardDemo(u);
    if (!(await bcrypt.compare(password, u.password))) throw new UnauthorizedException('Your password is incorrect.');
    await this.prisma.user.delete({ where: { id: userId } }); // every record cascades from the user
    return { ok: true };
  }
}
