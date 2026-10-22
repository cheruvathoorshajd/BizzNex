import { Logger } from '@nestjs/common';
import { DemoService } from './demo.service';
import * as workspace from './demo-workspace';

describe('DemoService', () => {
  const config: any = { get: () => '30' };
  let reset: jest.SpyInstance;

  beforeAll(() => jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined));
  beforeEach(() => { reset = jest.spyOn(workspace, 'resetDemoWorkspace').mockResolvedValue({ reset: true, resetAt: new Date() }); });
  afterEach(() => reset.mockRestore());

  it('checks once for simultaneous sign-ins, then not again until it is stale', async () => {
    const svc = new DemoService({} as any, config);
    await Promise.all([svc.resetIfStale(), svc.resetIfStale(), svc.resetIfStale()]);
    expect(reset).toHaveBeenCalledTimes(1);
    expect(reset).toHaveBeenCalledWith({}, 30 * 60_000); // the DB decides whether it is stale
    await svc.resetIfStale();
    expect(reset).toHaveBeenCalledTimes(1);
    await svc.resetIfStale(Date.now() + 31 * 60_000);
    expect(reset).toHaveBeenCalledTimes(2);
  });

  it('trusts a recent reset by another instance', async () => {
    reset.mockResolvedValueOnce({ reset: false, resetAt: new Date(Date.now() - 10 * 60_000) });
    const svc = new DemoService({} as any, config);
    await svc.resetIfStale();
    await svc.resetIfStale(Date.now() + 15 * 60_000);
    expect(reset).toHaveBeenCalledTimes(1);
    await svc.resetIfStale(Date.now() + 21 * 60_000);
    expect(reset).toHaveBeenCalledTimes(2);
  });

  it('tries again next time if a reset fails', async () => {
    reset.mockRejectedValueOnce(new Error('db down'));
    const svc = new DemoService({} as any, config);
    await expect(svc.resetIfStale()).rejects.toThrow('db down');
    await svc.resetIfStale();
    expect(reset).toHaveBeenCalledTimes(2);
  });
});

describe('resetDemoWorkspace', () => {
  const make = (onboarding: object | null) => {
    const del = () => ({ deleteMany: jest.fn() });
    const create = () => ({ create: jest.fn().mockResolvedValue({ id: 'x' }) });
    const tx: any = {
      $executeRaw: jest.fn(),
      user: { findUnique: jest.fn().mockResolvedValue(onboarding && { onboarding }), upsert: jest.fn().mockResolvedValue({ id: 'demo' }) },
      activity: { ...del(), ...create() }, deal: { ...del(), ...create() }, contact: { ...del(), ...create() }, company: { ...del(), ...create() },
      campaign: { ...del(), ...create() }, post: { ...del(), ...create() }, event: { ...del(), ...create() },
      notification: { ...del(), ...create() }, project: { ...del(), ...create() }, note: { ...del(), ...create() },
    };
    const prisma: any = { $transaction: (fn: (t: any) => unknown) => fn(tx) };
    return { tx, prisma };
  };

  it('skips a fresh workspace under the advisory lock', async () => {
    const { tx, prisma } = make({ resetAt: new Date().toISOString() });
    await expect(workspace.resetDemoWorkspace(prisma, 30 * 60_000)).resolves.toMatchObject({ reset: false });
    expect(tx.$executeRaw.mock.calls[0][0].join('')).toContain('pg_advisory_xact_lock');
    expect(tx.user.upsert).not.toHaveBeenCalled();
  });

  it('resets a stale workspace, records when, and signs out old sessions', async () => {
    const { tx, prisma } = make({ resetAt: new Date(Date.now() - 31 * 60_000).toISOString() });
    await expect(workspace.resetDemoWorkspace(prisma, 30 * 60_000)).resolves.toMatchObject({ reset: true });
    const { update } = tx.user.upsert.mock.calls[0][0];
    expect(update.tokenVersion).toEqual({ increment: 1 });
    expect(Date.parse(update.onboarding.resetAt)).toBeGreaterThan(Date.now() - 5000);
  });
});
