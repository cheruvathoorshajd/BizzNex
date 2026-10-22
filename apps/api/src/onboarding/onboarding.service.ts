import { Injectable, UnauthorizedException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import type { OnboardingState, SampleIds, UpdateOnboardingInput, User } from '@bizznex/shared';
import { PrismaService } from '../prisma/prisma.service';
import { toUser } from '../users/users.service';
import { guardDemo } from '../common/demo-guard';

const union = (a: string[] = [], b: string[] = []) => Array.from(new Set([...a, ...b]));
const days = (n: number) => new Date(Date.now() + n * 86_400_000);

const DEMO_ONBOARDING = 'Everyone shares the demo account, so demo progress stays in your browser. Create your own account to save it.';

/** The sample projects' tasks. Older sample states didn't record task ids, so clearing falls back to these names. */
const sampleTasks = () => ({
  relaunch: [
    { name: 'Finalise homepage copy', description: 'Hero, pricing and FAQ sections.', status: 'Completed', startDate: days(-14), endDate: days(-4) },
    { name: 'Build pricing page', description: 'Three tiers with an annual toggle.', status: 'In Progress', startDate: days(-3), endDate: days(5) },
    { name: 'QA on mobile', description: 'iOS Safari and Android Chrome.', status: 'Pending', startDate: days(4), endDate: days(9) },
  ],
  sales: [
    { name: 'Build target account list', description: '50 mid-market accounts.', status: 'Completed', startDate: days(-10), endDate: days(-6) },
    { name: 'Outbound sequence v2', description: 'Four-touch email and call cadence.', status: 'Pending', startDate: days(1), endDate: days(12) },
  ],
});
const SAMPLE_TASK_NAMES = Object.values(sampleTasks()).flat().map((t) => t.name);

type Tx = Prisma.TransactionClient;

@Injectable()
export class OnboardingService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Read-merge-write of `User.onboarding` with the row locked (SELECT … FOR UPDATE), so two tabs
   * or a double click can't overwrite each other's changes. `fn` returns the next state.
   */
  private withState(userId: string, fn: (tx: Tx, cur: OnboardingState) => Promise<OnboardingState>, timeout?: number): Promise<User> {
    return this.prisma.$transaction(async (tx) => {
      const [row] = await tx.$queryRaw<{ email: string; onboarding: Prisma.JsonValue }[]>`
        SELECT "email", "onboarding" FROM "User" WHERE "id" = ${userId} FOR UPDATE`;
      if (!row) throw new UnauthorizedException();
      guardDemo(row, DEMO_ONBOARDING);
      const cur = (row.onboarding && typeof row.onboarding === 'object' && !Array.isArray(row.onboarding)
        ? row.onboarding : {}) as OnboardingState;
      const next = await fn(tx, cur);
      const u = await tx.user.update({ where: { id: userId }, data: { onboarding: next as unknown as Prisma.InputJsonValue } });
      return toUser(u);
    }, timeout ? { timeout } : undefined);
  }

  update(userId: string, input: UpdateOnboardingInput): Promise<User> {
    return this.withState(userId, async (_tx, cur) => ({
      ...cur,
      ...(input.wizard !== undefined && { wizard: input.wizard }),
      ...(input.tourDone !== undefined && { tourDone: input.tourDone }),
      ...(input.checklistDismissed !== undefined && { checklistDismissed: input.checklistDismissed }),
      ...(input.profile && { profile: { ...cur.profile, ...input.profile } }),
      // seen/actions only ever grow, so two tabs can't erase each other's progress
      ...(input.seen && { seen: union(cur.seen, input.seen) }),
      ...(input.actions && { actions: union(cur.actions, input.actions) }),
    }));
  }

  /** Idempotent: the "already seeded?" check runs under the same row lock as the inserts, so a double POST seeds once. */
  seedSample(userId: string): Promise<User> {
    return this.withState(userId, async (tx, cur) => {
      if (cur.sample) return cur;
      return { ...cur, sample: await this.insertSample(tx, userId) };
    }, 20_000);
  }

  private async insertSample(tx: Tx, userId: string): Promise<SampleIds> {
    const own = { userId };
    const tasks = sampleTasks();

    const p1 = await tx.project.create({
      data: {
        ...own, name: 'Website relaunch', owner: 'You', spend: 18400, trend: [2100, 2600, 2900, 3300, 3600, 3900],
        tasks: { create: tasks.relaunch },
      },
    });
    const p2 = await tx.project.create({
      data: {
        ...own, name: 'Q4 sales push', owner: 'You', spend: 9200, trend: [1200, 1300, 1500, 1400, 1800, 2000],
        tasks: { create: tasks.sales },
      },
    });

    const northwind = await tx.company.create({ data: { ...own, name: 'Northwind Studio', industry: 'Design agency', website: 'northwind.example.com' } });
    const helio = await tx.company.create({ data: { ...own, name: 'Helio Foods', industry: 'Food & beverage', website: 'heliofoods.example.com' } });
    const kestrel = await tx.company.create({ data: { ...own, name: 'Kestrel Logistics', industry: 'Logistics', website: 'kestrel.example.com' } });

    const ava = await tx.contact.create({ data: { ...own, name: 'Ava Lindqvist', title: 'Creative Director', email: 'ava@northwind.example.com', phone: '+1 555 0101', companyId: northwind.id } });
    const raj = await tx.contact.create({ data: { ...own, name: 'Raj Mehta', title: 'Head of Procurement', email: 'raj@heliofoods.example.com', phone: '+1 555 0144', companyId: helio.id } });
    const tom = await tx.contact.create({ data: { ...own, name: 'Tom Okafor', title: 'COO', email: 'tom@kestrel.example.com', phone: '+1 555 0177', companyId: kestrel.id } });

    const d1 = await tx.deal.create({ data: { ...own, title: 'Brand refresh retainer', value: 24000, stage: 'Proposal', contactId: ava.id, companyId: northwind.id, closeDate: days(18) } });
    const d2 = await tx.deal.create({ data: { ...own, title: 'Packaging rollout', value: 41000, stage: 'Qualified', contactId: raj.id, companyId: helio.id, closeDate: days(35) } });
    const d3 = await tx.deal.create({ data: { ...own, title: 'Fleet dashboard pilot', value: 12500, stage: 'Lead', contactId: tom.id, companyId: kestrel.id, closeDate: days(50) } });
    const d4 = await tx.deal.create({ data: { ...own, title: 'Seasonal campaign', value: 8600, stage: 'Won', contactId: raj.id, companyId: helio.id, closeDate: days(-6) } });

    const acts = [
      await tx.activity.create({ data: { ...own, type: 'Call', subject: 'Discovery call with Ava', notes: 'Wants a phased rollout, starting with the logo suite.', done: true, contactId: ava.id, dealId: d1.id, dueDate: days(-2) } }),
      await tx.activity.create({ data: { ...own, type: 'Email', subject: 'Send packaging proposal', notes: 'Include the sustainability options.', contactId: raj.id, dealId: d2.id, dueDate: days(2) } }),
      await tx.activity.create({ data: { ...own, type: 'Meeting', subject: 'Pilot scoping with Tom', contactId: tom.id, dealId: d3.id, dueDate: days(6) } }),
    ];

    const notes = [
      await tx.note.create({ data: { ...own, title: 'Pricing ideas for 2027', description: 'Annual plan with two months free. Test a usage-based add-on for larger teams.', date: days(-1) } }),
      await tx.note.create({ data: { ...own, title: 'Client offsite', location: 'Lisbon', description: 'Agenda: retros, roadmap, team dinner.', date: days(21) } }),
    ];

    const post = await tx.post.create({ data: { ...own, title: 'We just relaunched our website', body: 'A faster, cleaner site, with pricing that finally makes sense. Take a look and tell us what you think.', platforms: ['LinkedIn', 'Twitter'], status: 'draft' } });
    const camp = await tx.campaign.create({ data: { ...own, title: 'October product update', subject: 'New this month at a glance', content: 'Three new features, one big fix, and a sneak peek at what comes next.', audience: 'All subscribers', status: 'draft' } });

    const events = [
      await tx.event.create({ data: { ...own, name: 'SaaS Founders Meetup', category: 'Business & Networking', location: 'Boston, MA', startsAt: days(12) } }),
      await tx.event.create({ data: { ...own, name: 'Client workshop: Helio', category: 'General', location: 'Video call', startsAt: days(4) } }),
    ];
    const notifs = [
      await tx.notification.create({ data: { ...own, kind: 'deal', message: 'Deal won · Seasonal campaign ($8,600)' } }),
      await tx.notification.create({ data: { ...own, kind: 'task', message: 'Task due soon · Build pricing page' } }),
    ];

    const taskIds = await tx.task.findMany({ where: { projectId: { in: [p1.id, p2.id] } }, select: { id: true } });

    return {
      projects: [p1.id, p2.id],
      tasks: taskIds.map((x) => x.id),
      companies: [northwind.id, helio.id, kestrel.id],
      contacts: [ava.id, raj.id, tom.id],
      deals: [d1.id, d2.id, d3.id, d4.id],
      activities: acts.map((x) => x.id),
      notes: notes.map((x) => x.id),
      posts: [post.id],
      campaigns: [camp.id],
      events: events.map((x) => x.id),
      notifications: notifs.map((x) => x.id),
    };
  }

  /** Removes the sample records only. Tasks the user added to a sample project keep that project alive. */
  clearSample(userId: string): Promise<User> {
    return this.withState(userId, async (tx, cur) => {
      const s = cur.sample;
      if (s) {
        const scope = (list: string[] = []) => ({ where: { userId, id: { in: list } } });
        await tx.activity.deleteMany(scope(s.activities));
        await tx.deal.deleteMany(scope(s.deals));
        await tx.contact.deleteMany(scope(s.contacts));
        await tx.company.deleteMany(scope(s.companies));
        // sample tasks explicitly (older states lack their ids: match the seeded names in the sample projects)
        await tx.task.deleteMany({
          where: {
            project: { userId },
            ...(s.tasks ? { id: { in: s.tasks } } : { projectId: { in: s.projects }, name: { in: SAMPLE_TASK_NAMES } }),
          },
        });
        // then only the sample projects that are now empty, so no user task goes with a project cascade
        await tx.project.deleteMany({ where: { userId, id: { in: s.projects }, tasks: { none: {} } } });
        await tx.note.deleteMany(scope(s.notes));
        await tx.post.deleteMany(scope(s.posts));
        await tx.campaign.deleteMany(scope(s.campaigns));
        await tx.event.deleteMany(scope(s.events));
        await tx.notification.deleteMany(scope(s.notifications));
      }
      return { ...cur, sample: null };
    }, 20_000);
  }
}
