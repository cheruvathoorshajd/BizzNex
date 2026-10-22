import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { AssistantAskInput, AssistantReply } from '@bizznex/shared';

const money = (n: number) => '$' + Math.round(n).toLocaleString('en-US');
const day = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

export type Intent = 'deals' | 'tasks' | 'contacts' | 'activities' | 'overview';

/* Whole words only (\b), so "calculate" isn't a call and "won't" isn't a won deal. Checked in order. */
const INTENTS: [Exclude<Intent, 'overview'>, RegExp][] = [
  ['deals', /\b(deals?|pipeline|sales|revenue|won(?!['’]t\b))\b/],
  ['tasks', /\b(tasks?|due|this week|deadlines?|overdue|to-?dos?)\b/],
  ['contacts', /\b(contacts?|customers?|clients?|company|companies|people)\b/],
  ['activities', /\b(activity|activities|follow[- ]?ups?|calls?|meetings?|emails?)\b/],
];

/** Which question this is. Anything unrecognised gets the overview and the list of what Brenda can answer. */
export function matchIntent(prompt: string): Intent {
  const q = prompt.toLowerCase();
  return INTENTS.find(([, re]) => re.test(q))?.[0] ?? 'overview';
}

/** Start of today and end of this week (Sunday), in server time. */
function weekBounds(now: Date) {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfWeek = new Date(today);
  endOfWeek.setDate(today.getDate() + ((7 - today.getDay()) % 7));
  endOfWeek.setHours(23, 59, 59, 999);
  return { today, endOfWeek };
}

/**
 * Brenda — a local, rule-based assistant. Answers a fixed set of questions from the
 * user's own BizzNex data. No external API, no keys, no network calls.
 */
@Injectable()
export class AssistantService {
  constructor(private readonly prisma: PrismaService) {}

  async ask(userId: string, dto: AssistantAskInput): Promise<AssistantReply> {
    const intent = matchIntent(dto.prompt);

    const [deals, contacts, companies, projects, activities] = await Promise.all([
      this.prisma.deal.findMany({ where: { userId } }),
      this.prisma.contact.count({ where: { userId } }),
      this.prisma.company.count({ where: { userId } }),
      this.prisma.project.findMany({ where: { userId }, include: { tasks: true } }),
      this.prisma.activity.findMany({ where: { userId, done: false } }),
    ]);

    const tasks = projects.flatMap((p) => p.tasks);
    const openTasks = tasks.filter((t) => t.status !== 'Completed');

    if (intent === 'deals') {
      if (!deals.length) return { reply: 'You have no deals yet. Add one from the Deals view to start a pipeline.' };
      const open = deals.filter((d) => d.stage !== 'Won' && d.stage !== 'Lost');
      const pipeline = open.reduce((s, d) => s + d.value, 0);
      const won = deals.filter((d) => d.stage === 'Won');
      const wonValue = won.reduce((s, d) => s + d.value, 0);
      const byStage = ['Lead', 'Qualified', 'Proposal', 'Won', 'Lost']
        .map((st) => `${st}: ${deals.filter((d) => d.stage === st).length}`)
        .join(' · ');
      return {
        reply: `You have ${deals.length} deals. Open pipeline is ${money(pipeline)} across ${open.length} deals; ${won.length} won (${money(wonValue)}).\nBy stage — ${byStage}.`,
      };
    }

    if (intent === 'tasks') {
      if (!openTasks.length) return { reply: "You have no open tasks — you're all clear." };
      const { today, endOfWeek } = weekBounds(new Date());
      const dated = openTasks
        .filter((t): t is typeof t & { endDate: Date } => t.endDate != null)
        .sort((a, b) => +a.endDate - +b.endDate);
      const overdue = dated.filter((t) => t.endDate < today);
      const thisWeek = dated.filter((t) => t.endDate >= today && t.endDate <= endOfWeek);
      const undated = openTasks.length - dated.length;
      const line = (t: { name: string; endDate: Date }) => `• ${t.name} (due ${day(t.endDate)})`;
      const parts = [
        thisWeek.length
          ? `${thisWeek.length} task${thisWeek.length === 1 ? '' : 's'} due by the end of this week:\n${thisWeek.slice(0, 8).map(line).join('\n')}`
          : 'Nothing is due by the end of this week.',
      ];
      if (overdue.length) parts.push(`Overdue (${overdue.length}):\n${overdue.slice(0, 8).map(line).join('\n')}`);
      if (undated) parts.push(`${undated} open task${undated === 1 ? ' has' : 's have'} no due date.`);
      return { reply: parts.join('\n\n') };
    }

    if (intent === 'contacts') {
      return { reply: `You have ${contacts} contacts across ${companies} companies. Add or edit them in the Contacts and Companies views.` };
    }

    if (intent === 'activities') {
      if (!activities.length) return { reply: 'No open activities logged. Log calls, emails and meetings from the Activities view.' };
      const list = activities.slice(0, 5).map((a) => `• ${a.type}: ${a.subject}`).join('\n');
      return { reply: `You have ${activities.length} open activities:\n${list}` };
    }

    return {
      reply:
        `I'm Brenda, BizzNex's built-in assistant. I answer a few questions from your own data.\n` +
        `Snapshot: ${deals.length} deals, ${contacts} contacts, ${companies} companies, ${openTasks.length} open tasks.\n` +
        `Try asking about your "deals", "tasks due this week", "contacts", or "open activities".`,
    };
  }
}
