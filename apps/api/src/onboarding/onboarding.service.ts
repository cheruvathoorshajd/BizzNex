import { Injectable, UnauthorizedException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import type { OnboardingState, SampleIds, UpdateOnboardingInput, User } from '@bizznex/shared';
import { PrismaService } from '../prisma/prisma.service';
import { toUser } from '../users/users.service';

const union = (a: string[] = [], b: string[] = []) => Array.from(new Set([...a, ...b]));
const days = (n: number) => new Date(Date.now() + n * 86_400_000);

@Injectable()
export class OnboardingService {
  constructor(private readonly prisma: PrismaService) {}

  private async state(userId: string): Promise<OnboardingState> {
    const u = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!u) throw new UnauthorizedException();
    return toUser(u).onboarding;
  }

  private async save(userId: string, next: OnboardingState): Promise<User> {
    const u = await this.prisma.user.update({
      where: { id: userId },
      data: { onboarding: next as unknown as Prisma.InputJsonValue },
    });
    return toUser(u);
  }

  async update(userId: string, input: UpdateOnboardingInput): Promise<User> {
    const cur = await this.state(userId);
    return this.save(userId, {
      ...cur,
      ...(input.wizard !== undefined && { wizard: input.wizard }),
      ...(input.tourDone !== undefined && { tourDone: input.tourDone }),
      ...(input.checklistDismissed !== undefined && { checklistDismissed: input.checklistDismissed }),
      ...(input.profile && { profile: { ...cur.profile, ...input.profile } }),
      // seen/actions only ever grow, so two tabs can't erase each other's progress
      ...(input.seen && { seen: union(cur.seen, input.seen) }),
      ...(input.actions && { actions: union(cur.actions, input.actions) }),
    });
  }

  async seedSample(userId: string): Promise<User> {
    const cur = await this.state(userId);
    if (cur.sample) return this.save(userId, cur);

    const sample = await this.prisma.$transaction(async (tx) => {
      const own = { userId };

      const p1 = await tx.project.create({
        data: {
          ...own, name: 'Website relaunch', owner: 'You', spend: 18400, trend: [2100, 2600, 2900, 3300, 3600, 3900],
          tasks: {
            create: [
              { name: 'Finalise homepage copy', description: 'Hero, pricing and FAQ sections.', status: 'Completed', startDate: days(-14), endDate: days(-4) },
              { name: 'Build pricing page', description: 'Three tiers with an annual toggle.', status: 'In Progress', startDate: days(-3), endDate: days(5) },
              { name: 'QA on mobile', description: 'iOS Safari and Android Chrome.', status: 'Pending', startDate: days(4), endDate: days(9) },
            ],
          },
        },
      });
      const p2 = await tx.project.create({
        data: {
          ...own, name: 'Q4 sales push', owner: 'You', spend: 9200, trend: [1200, 1300, 1500, 1400, 1800, 2000],
          tasks: {
            create: [
              { name: 'Build target account list', description: '50 mid-market accounts.', status: 'Completed', startDate: days(-10), endDate: days(-6) },
              { name: 'Outbound sequence v2', description: 'Four-touch email and call cadence.', status: 'Pending', startDate: days(1), endDate: days(12) },
            ],
          },
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

      const tasks = await tx.task.findMany({ where: { projectId: { in: [p1.id, p2.id] } }, select: { id: true } });

      const ids: SampleIds = {
        projects: [p1.id, p2.id],
        tasks: tasks.map((x) => x.id),
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
      return ids;
    });

    return this.save(userId, { ...cur, sample });
  }

  async clearSample(userId: string): Promise<User> {
    const cur = await this.state(userId);
    const s = cur.sample;
    if (s) {
      const scope = (list: string[]) => ({ where: { userId, id: { in: list } } });
      await this.prisma.$transaction([
        this.prisma.activity.deleteMany(scope(s.activities)),
        this.prisma.deal.deleteMany(scope(s.deals)),
        this.prisma.contact.deleteMany(scope(s.contacts)),
        this.prisma.company.deleteMany(scope(s.companies)),
        this.prisma.project.deleteMany(scope(s.projects)), // tasks cascade
        this.prisma.note.deleteMany(scope(s.notes)),
        this.prisma.post.deleteMany(scope(s.posts)),
        this.prisma.campaign.deleteMany(scope(s.campaigns)),
        this.prisma.event.deleteMany(scope(s.events)),
        this.prisma.notification.deleteMany(scope(s.notifications)),
      ]);
    }
    return this.save(userId, { ...cur, sample: null });
  }
}
