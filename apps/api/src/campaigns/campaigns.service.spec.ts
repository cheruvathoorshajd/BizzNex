import { BadRequestException } from '@nestjs/common';
import { CampaignsService } from './campaigns.service';

describe('CampaignsService', () => {
  const prisma: any = {
    campaign: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn((a: any) => Promise.resolve({ id: 'c1', ...a.data })),
      update: jest.fn((a: any) => Promise.resolve({ id: a.where.id, title: 'T', subject: '', ...a.data })),
      updateMany: jest.fn(),
      delete: jest.fn(),
    },
    contact: { count: jest.fn().mockResolvedValue(7) },
    $transaction: jest.fn((fn: (tx: any) => unknown) => fn(prisma)),
  };
  const notifications: any = { notify: jest.fn().mockResolvedValue({}) };
  const svc = new CampaignsService(prisma, notifications);

  afterEach(() => jest.clearAllMocks());

  it('counts recipients as contacts with an email', async () => {
    const c = await svc.create('u1', { title: 'Hi', subject: 'Hello', content: '', status: 'sent' } as any);
    expect(prisma.contact.count).toHaveBeenCalledWith({ where: { userId: 'u1', NOT: { email: '' } } });
    expect(c.recipients).toBe(7);
    expect(c.sentAt).toBeInstanceOf(Date);
    expect(notifications.notify).toHaveBeenCalledWith('u1', 'campaign', 'Campaign sent: Hello to 7 recipients', prisma);
  });

  it('rejects scheduling in the past', async () => {
    await expect(
      svc.create('u1', { title: 'Hi', status: 'scheduled', scheduledAt: new Date(Date.now() - 1000).toISOString() } as any),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('delivers past-due scheduled campaigns when listed, and notifies once per delivered row', async () => {
    const due = new Date(Date.now() - 60_000);
    prisma.campaign.findMany
      .mockResolvedValueOnce([
        { id: 'a', title: 'A', subject: 'Subject A', scheduledAt: due },
        { id: 'b', title: 'B', subject: '', scheduledAt: due },
      ])
      .mockResolvedValueOnce([{ id: 'a' }, { id: 'b' }]);
    // 'b' was already delivered by a concurrent read: its guarded update changes nothing.
    prisma.campaign.updateMany.mockResolvedValueOnce({ count: 1 }).mockResolvedValueOnce({ count: 0 });

    await svc.list('u1');

    expect(prisma.campaign.findMany.mock.calls[0][0].where).toEqual({ userId: 'u1', status: 'scheduled', scheduledAt: { lte: expect.any(Date) } });
    expect(prisma.campaign.updateMany).toHaveBeenCalledWith({
      where: { id: 'a', status: 'scheduled' },
      data: { status: 'sent', sentAt: due, recipients: 7 },
    });
    expect(notifications.notify).toHaveBeenCalledTimes(1);
    expect(notifications.notify).toHaveBeenCalledWith('u1', 'campaign', 'Campaign sent: Subject A to 7 recipients', prisma);
  });

  it('does nothing extra when no scheduled campaign is due', async () => {
    prisma.campaign.findMany.mockResolvedValueOnce([]).mockResolvedValueOnce([]);
    await svc.list('u1');
    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(notifications.notify).not.toHaveBeenCalled();
  });

  it('sets sentAt and recipients on the server when an update sends a draft', async () => {
    prisma.campaign.findMany.mockResolvedValueOnce([]);
    prisma.campaign.findFirst.mockResolvedValueOnce({ id: 'c1', status: 'draft', title: 'T', subject: '', scheduledAt: null });
    const c = await svc.update('u1', 'c1', { status: 'sent' });
    expect(c.recipients).toBe(7);
    expect(c.sentAt).toBeInstanceOf(Date);
    expect(notifications.notify).toHaveBeenCalledWith('u1', 'campaign', 'Campaign sent: T to 7 recipients', prisma);
  });

  it('will not un-send a sent campaign', async () => {
    prisma.campaign.findMany.mockResolvedValueOnce([]);
    prisma.campaign.findFirst.mockResolvedValueOnce({ id: 'c1', status: 'sent' });
    await expect(svc.update('u1', 'c1', { status: 'draft' })).rejects.toBeInstanceOf(BadRequestException);
  });
});
