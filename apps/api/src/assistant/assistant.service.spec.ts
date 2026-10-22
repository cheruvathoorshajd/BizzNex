import { AssistantService, matchIntent } from './assistant.service';

describe('matchIntent', () => {
  it.each([
    ['How is my pipeline?', 'deals'],
    ['Which deals did we win', 'deals'],
    ['How many have we won?', 'deals'],
    ['What tasks are due this week?', 'tasks'],
    ['anything overdue', 'tasks'],
    ['how many contacts do I have', 'contacts'],
    ['list my companies', 'contacts'],
    ['open activities', 'activities'],
    ['any calls to make?', 'activities'],
    ['hello', 'overview'],
  ])('%s → %s', (q, intent) => expect(matchIntent(q)).toBe(intent));

  it('matches whole words only', () => {
    expect(matchIntent("I won't forget")).toBe('overview');
    expect(matchIntent('I won’t forget')).toBe('overview');
    expect(matchIntent('calculate 2+2')).toBe('overview');
    expect(matchIntent('the wonderful idealist')).toBe('overview');
    expect(matchIntent('recall that')).toBe('overview');
  });
});

describe('AssistantService', () => {
  const prisma: any = {
    deal: { findMany: jest.fn().mockResolvedValue([]) },
    contact: { count: jest.fn().mockResolvedValue(0) },
    company: { count: jest.fn().mockResolvedValue(0) },
    project: { findMany: jest.fn() },
    activity: { findMany: jest.fn().mockResolvedValue([]) },
  };
  const svc = new AssistantService(prisma);

  beforeAll(() => jest.useFakeTimers().setSystemTime(new Date(2026, 9, 21, 12))); // Wed 21 Oct 2026
  afterAll(() => jest.useRealTimers());

  it('lists tasks due this week, overdue separately, and leaves out undated and later tasks', async () => {
    prisma.project.findMany.mockResolvedValue([{ tasks: [
      { name: 'Friday thing', status: 'Pending', endDate: new Date(2026, 9, 23) },
      { name: 'Sunday thing', status: 'In Progress', endDate: new Date(2026, 9, 25, 18) },
      { name: 'Next week', status: 'Pending', endDate: new Date(2026, 9, 27) },
      { name: 'Late one', status: 'Pending', endDate: new Date(2026, 9, 19) },
      { name: 'Done one', status: 'Completed', endDate: new Date(2026, 9, 22) },
      { name: 'Someday', status: 'Pending', endDate: null },
    ] }]);
    const { reply } = await svc.ask('u1', { prompt: 'tasks due this week' });
    const [week, overdue, undated] = reply.split('\n\n');
    expect(week).toContain('2 tasks due');
    expect(week).toContain('Friday thing');
    expect(week).toContain('Sunday thing');
    expect(reply).not.toContain('Next week');
    expect(overdue).toContain('Late one');
    expect(reply).not.toContain('Done one');
    expect(reply).not.toContain('Someday');
    expect(undated).toBe('1 open task has no due date.');
  });

  it('replies with just the text (no configured flag)', async () => {
    prisma.project.findMany.mockResolvedValue([]);
    const r = await svc.ask('u1', { prompt: 'hi' });
    expect(r).toEqual({ reply: expect.stringContaining('Brenda') });
  });
});
