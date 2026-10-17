import { ConflictException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  const users: any = { findByEmail: jest.fn(), findById: jest.fn(), create: jest.fn() };
  const jwt: any = { sign: jest.fn().mockReturnValue('tok') };
  const demo: any = { resetIfStale: jest.fn().mockResolvedValue(undefined) };
  const svc = new AuthService(users, jwt, demo);

  afterEach(() => jest.clearAllMocks());

  it('registers a new user and returns a token', async () => {
    users.findByEmail.mockResolvedValueOnce(null);
    users.create.mockResolvedValueOnce({ id: 'u1', email: 'a@b.co', name: 'A', createdAt: new Date() });
    const r = await svc.register({ email: 'a@b.co', password: 'secret-12', name: 'A' });
    expect(r.token).toBe('tok');
    expect(r.user.email).toBe('a@b.co');
    expect(r.user).not.toHaveProperty('password');
  });

  it('rejects a duplicate email', async () => {
    users.findByEmail.mockResolvedValueOnce({ id: 'x' });
    await expect(svc.register({ email: 'a@b.co', password: 'secret-12', name: 'A' }))
      .rejects.toBeInstanceOf(ConflictException);
  });

  it('logs in with the correct password', async () => {
    const password = await bcrypt.hash('secret1', 10);
    users.findByEmail.mockResolvedValueOnce({ id: 'u1', email: 'a@b.co', name: 'A', password, createdAt: new Date() });
    const r = await svc.login({ email: 'a@b.co', password: 'secret1' });
    expect(r.user.id).toBe('u1');
  });

  it('rejects a wrong password', async () => {
    const password = await bcrypt.hash('secret1', 10);
    users.findByEmail.mockResolvedValueOnce({ id: 'u1', email: 'a@b.co', name: 'A', password, createdAt: new Date() });
    await expect(svc.login({ email: 'a@b.co', password: 'nope' }))
      .rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('refreshes the shared demo workspace before a demo sign-in, and only then', async () => {
    const password = await bcrypt.hash('password', 4);
    users.findByEmail.mockResolvedValue({ id: 'd1', email: 'demo@bizznex.app', name: 'Demo', password, createdAt: new Date(), tokenVersion: 0 });
    await svc.login({ email: 'Demo@BizzNex.app', password: 'password' });
    expect(demo.resetIfStale).toHaveBeenCalledTimes(1);
    users.findByEmail.mockResolvedValue(null);
    await expect(svc.login({ email: 'a@b.co', password: 'x' })).rejects.toBeInstanceOf(UnauthorizedException);
    expect(demo.resetIfStale).toHaveBeenCalledTimes(1);
  });

  it('puts the token version into the token', async () => {
    users.findByEmail.mockResolvedValueOnce(null);
    users.create.mockResolvedValueOnce({ id: 'u1', email: 'a@b.co', name: 'A', createdAt: new Date(), tokenVersion: 3 });
    await svc.register({ email: 'a@b.co', password: 'secret-12', name: 'A' });
    expect(jwt.sign).toHaveBeenCalledWith({ sub: 'u1', email: 'a@b.co', v: 3 });
  });
});
