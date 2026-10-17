import { NotFoundException } from '@nestjs/common';
import { ProjectsService } from './projects.service';

describe('ProjectsService', () => {
  const prisma: any = {
    project: {
      findMany: jest.fn().mockResolvedValue([{ id: 'p1' }]),
      findFirst: jest.fn(),
      create: jest.fn().mockResolvedValue({ id: 'p2' }),
      update: jest.fn().mockResolvedValue({ id: 'p1' }),
      delete: jest.fn().mockResolvedValue({}),
    },
  };
  const svc = new ProjectsService(prisma);

  afterEach(() => jest.clearAllMocks());

  it('lists projects for a user', async () => {
    const r = await svc.list('u1');
    expect(prisma.project.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: 'u1' } }),
    );
    expect(r).toEqual([{ id: 'p1' }]);
  });

  it('throws when a project is not found', async () => {
    prisma.project.findFirst.mockResolvedValueOnce(null);
    await expect(svc.get('u1', 'nope')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('creates a project with no invented spend history', async () => {
    await svc.create('u1', { name: 'New', owner: 'You', spend: 0 } as any);
    const arg = prisma.project.create.mock.calls[0][0];
    expect(arg.data.trend).toEqual([]);
    expect(arg.data.userId).toBe('u1');
  });
});
