import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import type { OnboardingState, User, UserPreferences } from '@bizznex/shared';
import { PrismaService } from '../prisma/prisma.service';

/** Public shape of a user row — never includes the password hash. */
export function toUser(u: { id: string; email: string; name: string; createdAt: Date; onboarding?: Prisma.JsonValue; preferences?: Prisma.JsonValue }): User {
  const onboarding = (u.onboarding && typeof u.onboarding === 'object' && !Array.isArray(u.onboarding)
    ? u.onboarding : {}) as OnboardingState;
  const preferences = (u.preferences && typeof u.preferences === 'object' && !Array.isArray(u.preferences)
    ? u.preferences : {}) as UserPreferences;
  return { id: u.id, email: u.email, name: u.name, createdAt: u.createdAt.toISOString(), onboarding, preferences };
}

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
  }

  findById(id: string) {
    return this.prisma.user.findUnique({ where: { id } });
  }

  create(data: { email: string; password: string; name: string; onboarding?: Prisma.InputJsonValue }) {
    return this.prisma.user.create({ data });
  }
}
