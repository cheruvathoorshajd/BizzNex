import { BadRequestException, ConflictException, ForbiddenException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { AccountService } from './account.service';

describe('AccountService', () => {
  const prisma: any = { user: { findUnique: jest.fn(), update: jest.fn(), delete: jest.fn() } };
  const jwt: any = { sign: jest.fn().mockReturnValue('tok') };
  const svc = new AccountService(prisma, jwt);
  const row = (over: object = {}) => ({ id: 'u1', email: 'a@b.co', name: 'A', password: '', createdAt: new Date(), onboarding: {}, preferences: {}, tokenVersion: 0, ...over });

  afterEach(() => jest.clearAllMocks());

  it('refuses every change to the shared demo account', async () => {
    prisma.user.findUnique.mockResolvedValue(row({ email: 'demo@bizznex.app' }));
    await expect(svc.updateProfile('u1', { name: 'X' })).rejects.toBeInstanceOf(ForbiddenException);
    await expect(svc.changePassword('u1', { currentPassword: 'a', newPassword: 'longenough' })).rejects.toBeInstanceOf(ForbiddenException);
    await expect(svc.deleteAccount('u1', 'a')).rejects.toBeInstanceOf(ForbiddenException);
    await expect(svc.revokeSessions('u1')).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.user.update).not.toHaveBeenCalled();
    expect(prisma.user.delete).not.toHaveBeenCalled();
  });

  it('rejects an email another account already uses', async () => {
    const password = await bcrypt.hash('current-1', 4);
    prisma.user.findUnique.mockResolvedValueOnce(row({ password })).mockResolvedValueOnce(row({ id: 'u2', email: 'taken@b.co' }));
    await expect(svc.updateProfile('u1', { email: 'TAKEN@b.co', currentPassword: 'current-1' })).rejects.toBeInstanceOf(ConflictException);
  });

  it('changes the email only with the right current password', async () => {
    const password = await bcrypt.hash('current-1', 4);
    prisma.user.findUnique.mockResolvedValue(row({ password }));
    await expect(svc.updateProfile('u1', { email: 'new@b.co' })).rejects.toBeInstanceOf(BadRequestException);
    await expect(svc.updateProfile('u1', { email: 'new@b.co', currentPassword: 'wrong' })).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.user.update).not.toHaveBeenCalled();
    // a name-only change needs no password
    prisma.user.update.mockResolvedValue(row({ name: 'B' }));
    await expect(svc.updateProfile('u1', { name: 'B' })).resolves.toMatchObject({ token: 'tok' });
  });

  it('signs every session out by bumping the token version', async () => {
    prisma.user.findUnique.mockResolvedValue(row());
    prisma.user.update.mockResolvedValue(row({ tokenVersion: 1 }));
    await expect(svc.revokeSessions('u1')).resolves.toMatchObject({ token: 'tok' });
    expect(prisma.user.update.mock.calls[0][0].data.tokenVersion).toEqual({ increment: 1 });
  });

  it('changes the password only with the right current password', async () => {
    const password = await bcrypt.hash('current-1', 4);
    prisma.user.findUnique.mockResolvedValue(row({ password }));
    await expect(svc.changePassword('u1', { currentPassword: 'wrong', newPassword: 'brand-new-1' })).rejects.toBeInstanceOf(BadRequestException);
    prisma.user.update.mockImplementation(({ data }: any) => Promise.resolve(row({ tokenVersion: 1, password: data.password })));
    await expect(svc.changePassword('u1', { currentPassword: 'current-1', newPassword: 'brand-new-1' })).resolves.toMatchObject({ token: 'tok' });
    expect(prisma.user.update).toHaveBeenCalledTimes(1);
    // the version bump is what signs every other session out
    expect(prisma.user.update.mock.calls[0][0].data.tokenVersion).toEqual({ increment: 1 });
  });

  it('merges notification preferences instead of replacing them', async () => {
    prisma.user.findUnique.mockResolvedValue(row({ preferences: { startPage: 'deals', notifications: { dealWon: false } } }));
    prisma.user.update.mockImplementation(({ data }: any) => Promise.resolve(row({ preferences: data.preferences })));
    const u = await svc.updatePreferences('u1', { notifications: { weeklySummary: true } });
    expect(u.preferences).toEqual({ startPage: 'deals', notifications: { dealWon: false, weeklySummary: true } });
  });
});
