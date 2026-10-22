import type { Prisma, PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { DEMO_EMAIL } from '@bizznex/shared';

export const DEMO_PASSWORD = 'password';
export const DEMO_NAME = 'Dennis Sharon';

const d = (s: string) => new Date(s);

/** Every table that belongs to a user; order matters only for readability (all cascade from the user). */
async function wipe(tx: Prisma.TransactionClient, userId: string) {
  const where = { where: { userId } };
  await tx.activity.deleteMany(where);
  await tx.deal.deleteMany(where);
  await tx.contact.deleteMany(where);
  await tx.company.deleteMany(where);
  await tx.campaign.deleteMany(where);
  await tx.post.deleteMany(where);
  await tx.event.deleteMany(where);
  await tx.notification.deleteMany(where);
  await tx.project.deleteMany(where); // tasks cascade
  await tx.note.deleteMany(where);
}

async function fill(tx: Prisma.TransactionClient, userId: string) {
  await tx.project.create({
    data: {
      userId: userId, name: 'Thanksgiving Gifts', owner: 'You', spend: 2410, trend: [300, 320, 340, 360, 380, 395, 410],
      tasks: {
        create: [
          { name: 'Buy gift wrappers & cardboard', description: 'Pick up wrappers and cardboard before the weekend.', startDate: d('2026-01-01'), endDate: d('2026-01-10'), status: 'In Progress' },
          { name: 'Buy chocolates', description: "Don't forget the chocolates.", startDate: d('2026-01-11'), endDate: d('2026-01-20'), status: 'Completed' },
        ],
      },
    },
  });

  await tx.project.create({
    data: {
      userId: userId, name: 'Christmas Decorations', owner: 'R. Patel', spend: 1180, trend: [120, 130, 140, 150, 160, 170, 180],
      tasks: {
        create: [
          { name: 'Buy Christmas lights & ornaments', description: 'Lights and ornaments for the tree.', startDate: d('2026-12-01'), endDate: d('2026-12-10'), status: 'Pending' },
          { name: 'Set up the Christmas tree', description: 'Assemble and decorate the tree.', startDate: d('2026-12-11'), endDate: d('2026-12-20'), status: 'In Progress' },
        ],
      },
    },
  });

  await tx.project.create({
    data: {
      userId: userId, name: 'Q4 Newsletter', owner: 'A. Khan', spend: 540, trend: [50, 55, 60, 65, 70, 75, 80],
      tasks: {
        create: [
          { name: 'Draft the holiday newsletter', description: 'Holiday campaign email.', startDate: d('2026-08-12'), endDate: d('2026-08-30'), status: 'Pending' },
        ],
      },
    },
  });

  await tx.note.create({
    data: {
      userId: userId, title: 'Vendor shortlist', date: d('2026-09-05'),
      location: 'Central Park', description: 'Three vendors confirmed for the food festival booth.',
    },
  });

  // ── CRM demo data ──
  const acme = await tx.company.create({
    data: { userId: userId, name: 'Acme Retail', industry: 'Retail', website: 'acme.example.com' },
  });
  const globex = await tx.company.create({
    data: { userId: userId, name: 'Globex Events', industry: 'Events', website: 'globex.example.com' },
  });

  const maria = await tx.contact.create({
    data: { userId: userId, name: 'Maria Gomez', title: 'Buyer', email: 'maria@acme.example.com', phone: '+1 555 0134', companyId: acme.id },
  });
  const john = await tx.contact.create({
    data: { userId: userId, name: 'John Park', title: 'Event Lead', email: 'john@globex.example.com', phone: '+1 555 0177', companyId: globex.id },
  });
  await tx.contact.create({
    data: { userId: userId, name: 'Priya Nair', title: 'Owner', email: 'priya@example.com', phone: '+1 555 0199' },
  });

  const winter = await tx.deal.create({
    data: { userId: userId, title: 'Winter gift bundle order', value: 4200, stage: 'Proposal', contactId: maria.id, companyId: acme.id, closeDate: d('2026-11-15') },
  });
  await tx.deal.create({
    data: { userId: userId, title: 'Holiday event catering', value: 8800, stage: 'Qualified', contactId: john.id, companyId: globex.id, closeDate: d('2026-12-01') },
  });
  await tx.deal.create({
    data: { userId: userId, title: 'Newsletter sponsorship', value: 1500, stage: 'Won', contactId: maria.id, companyId: acme.id, closeDate: d('2026-09-10') },
  });
  await tx.deal.create({
    data: { userId: userId, title: 'Booth rental upsell', value: 900, stage: 'Lead' },
  });

  await tx.activity.create({
    data: { userId: userId, type: 'Call', subject: 'Intro call with Maria', notes: 'Discussed winter bundle sizing.', contactId: maria.id, dealId: winter.id, dueDate: d('2026-09-18') },
  });
  await tx.activity.create({
    data: { userId: userId, type: 'Email', subject: 'Send catering proposal', notes: 'Attach the seasonal menu.', contactId: john.id, dueDate: d('2026-09-20') },
  });
  await tx.activity.create({
    data: { userId: userId, type: 'Meeting', subject: 'Quarterly review', notes: 'Recap Q3 numbers.', done: true },
  });

  // ── Persisted-tool demo data ──
  await tx.campaign.create({
    data: { userId: userId, title: 'Holiday preview', subject: 'Your holiday picks are here', content: 'Early access for loyal customers.', audience: 'All subscribers', status: 'sent', recipients: 240, sentAt: d('2026-09-12') },
  });
  await tx.campaign.create({
    data: { userId: userId, title: 'December newsletter', subject: 'What to expect in December', content: 'Draft in progress.', audience: 'Monthly plan', status: 'draft' },
  });

  await tx.post.create({
    data: { userId: userId, title: 'Grand opening this weekend!', body: 'Doors open Saturday 9am — free samples all day.', platforms: ['Facebook', 'Instagram'], status: 'published', publishedAt: d('2026-09-11') },
  });

  await tx.event.create({
    data: { userId: userId, name: 'Vendor tasting', category: 'Food & Drink', location: 'Central Park', startsAt: d('2026-10-05') },
  });
  await tx.event.create({
    data: { userId: userId, name: 'Small business mixer', category: 'Business & Networking', location: 'Convention Center', startsAt: d('2026-10-18') },
  });

  await tx.notification.create({
    data: { userId: userId, kind: 'deal', message: 'Deal won: Newsletter sponsorship ($1,500)' },
  });
  await tx.notification.create({
    data: { userId: userId, kind: 'campaign', message: 'Campaign sent: Holiday preview (240 recipients)', read: true },
  });

}

export interface DemoReset { reset: boolean; resetAt: Date }

/**
 * Puts the shared demo workspace back to its known state, in one transaction so a
 * visitor never sees it half-built. Used by `npm run seed` (always) and by demo sign-in
 * (only when the last reset is older than `maxAgeMs`).
 *
 * The last reset time is stored on the demo user's row, so every API instance agrees on it.
 * The advisory lock makes a second instance wait for the first one's reset and then see it
 * as fresh, instead of resetting again. Waiting (rather than a try-lock) matters: the caller
 * signs a token right after this returns, and that token must carry the post-reset version.
 */
export async function resetDemoWorkspace(prisma: PrismaClient, maxAgeMs?: number): Promise<DemoReset> {
  return prisma.$transaction(async (tx) => {
    // any fixed key works, as long as every instance uses the same one; released at commit
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(4242001)`;
    const cur = await tx.user.findUnique({ where: { email: DEMO_EMAIL }, select: { onboarding: true } });
    const last = new Date(Date.parse((cur?.onboarding as { resetAt?: string } | null)?.resetAt ?? '') || 0);
    if (maxAgeMs != null && cur && Date.now() - last.getTime() < maxAgeMs) return { reset: false, resetAt: last };

    const resetAt = new Date();
    const password = await bcrypt.hash(DEMO_PASSWORD, 10);
    const user = await tx.user.upsert({
      where: { email: DEMO_EMAIL },
      // Onboarding progress for demo visits lives in the browser, so the account's `onboarding` only
      // holds the reset time. The version bump signs out sessions that were looking at the old data.
      update: { name: DEMO_NAME, password, onboarding: { resetAt: resetAt.toISOString() }, preferences: {}, tokenVersion: { increment: 1 } },
      create: { email: DEMO_EMAIL, password, name: DEMO_NAME, onboarding: { resetAt: resetAt.toISOString() } },
    });
    await wipe(tx, user.id);
    await fill(tx, user.id);
    return { reset: true, resetAt };
  }, { timeout: 20_000 });
}
