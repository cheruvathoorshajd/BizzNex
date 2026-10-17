import { Injectable, ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { UsersService, toUser } from '../users/users.service';
import { tokenPayload } from '../common/jwt-config';
import { DEMO_EMAIL } from '@bizznex/shared';
import type { RegisterInput, LoginInput, AuthResponse, User } from '@bizznex/shared';
import { DemoService } from '../demo/demo.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly users: UsersService,
    private readonly jwt: JwtService,
    private readonly demo: DemoService,
  ) {}

  private toUser(u: Parameters<typeof toUser>[0]): User {
    return toUser(u);
  }

  private sign(u: { id: string; email: string; tokenVersion: number }): string {
    return this.jwt.sign(tokenPayload(u));
  }

  async register(input: RegisterInput): Promise<AuthResponse> {
    const existing = await this.users.findByEmail(input.email.toLowerCase());
    if (existing) throw new ConflictException('Email already registered');
    const password = await bcrypt.hash(input.password, 10);
    const u = await this.users.create({
      email: input.email.toLowerCase(), password, name: input.name.trim(),
      onboarding: { wizard: 'pending' },
    });
    return { token: this.sign(u), user: this.toUser(u) };
  }

  async login(input: LoginInput): Promise<AuthResponse> {
    const email = input.email.toLowerCase();
    if (email === DEMO_EMAIL) await this.demo.resetIfStale();
    const u = await this.users.findByEmail(email);
    if (!u) throw new UnauthorizedException('Invalid credentials');
    const ok = await bcrypt.compare(input.password, u.password);
    if (!ok) throw new UnauthorizedException('Invalid credentials');
    return { token: this.sign(u), user: this.toUser(u) };
  }

  async me(userId: string): Promise<User> {
    const u = await this.users.findById(userId);
    if (!u) throw new UnauthorizedException();
    return this.toUser(u);
  }
}
