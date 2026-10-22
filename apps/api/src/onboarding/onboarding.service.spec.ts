import { ForbiddenException } from '@nestjs/common';
import { OnboardingService } from './onboarding.service';

describe('OnboardingService', () => {
  const del = () => ({ deleteMany: jest.fn().mockResolvedValue({ count: 0 }) });
  const tx: any = {
    $queryRaw: jest.fn(),
    user: { update: jest.fn() },
    activity: del(), deal: del(), contact: del(), company: del(), task: del(), project: del(),
    note: del(), post: del(), campaign: del(), event: del(), notification: del(),
  };
  const prisma: any = { $transaction: jest.fn((fn: (t: any) => unknown) => fn(tx)) };
  const svc = new OnboardingService(prisma);
  const row = (onboarding: object, email = 'a@b.co') => [{ email, onboarding }];
  const ids = (over: object = {}) => ({
    projects: ['p1', 'p2'], tasks: ['t1', 't2'], companies: [], contacts: [], deals: [], activities: [],
    notes: [], posts: [], campaigns: [], events: [], notifications: [], ...over,
  });

  beforeEach(() => {
    tx.user.update.mockImplementation(({ data }: any) => Promise.resolve({ id: 'u1', email: 'a@b.co', name: 'A', createdAt: new Date(), onboarding: data.onboarding }));
  });
  afterEach(() => jest.clearAllMocks());

  it('merges under a row lock', async () => {
    tx.$queryRaw.mockResolvedValue(row({ seen: ['deals'], profile: { company: 'Acme' } }));
    const u = await svc.update('u1', { seen: ['tasks'], profile: { industry: 'Manufacturing' } });
    expect(tx.$queryRaw.mock.calls[0][0].join('?')).toContain('FOR UPDATE');
    expect(u.onboarding).toEqual({ seen: ['deals', 'tasks'], profile: { company: 'Acme', industry: 'Manufacturing' } });
  });

  it('refuses the shared demo account', async () => {
    tx.$queryRaw.mockResolvedValue(row({}, 'demo@bizznex.app'));
    await expect(svc.update('u1', { tourDone: true })).rejects.toBeInstanceOf(ForbiddenException);
    await expect(svc.seedSample('u1')).rejects.toBeInstanceOf(ForbiddenException);
    await expect(svc.clearSample('u1')).rejects.toBeInstanceOf(ForbiddenException);
    expect(tx.user.update).not.toHaveBeenCalled();
  });

  it('does not seed twice', async () => {
    tx.$queryRaw.mockResolvedValue(row({ sample: ids() }));
    tx.project.create = jest.fn();
    await svc.seedSample('u1');
    expect(tx.project.create).not.toHaveBeenCalled();
  });

  it('clears sample tasks by id and keeps sample projects that hold the user’s own tasks', async () => {
    tx.$queryRaw.mockResolvedValue(row({ sample: ids() }));
    const u = await svc.clearSample('u1');
    expect(tx.task.deleteMany).toHaveBeenCalledWith({ where: { project: { userId: 'u1' }, id: { in: ['t1', 't2'] } } });
    expect(tx.project.deleteMany).toHaveBeenCalledWith({ where: { userId: 'u1', id: { in: ['p1', 'p2'] }, tasks: { none: {} } } });
    // the tasks go first, so a sample project only cascades once it is empty
    expect(tx.task.deleteMany.mock.invocationCallOrder[0]).toBeLessThan(tx.project.deleteMany.mock.invocationCallOrder[0]);
    expect(u.onboarding.sample).toBeNull();
  });

  it('falls back to the seeded task names for older states without task ids', async () => {
    tx.$queryRaw.mockResolvedValue(row({ sample: ids({ tasks: undefined }) }));
    await svc.clearSample('u1');
    const where = tx.task.deleteMany.mock.calls[0][0].where;
    expect(where.projectId).toEqual({ in: ['p1', 'p2'] });
    expect(where.name.in).toContain('Build pricing page');
    expect(where.id).toBeUndefined();
  });
});
