import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { AssistantAskInput, AssistantReply } from '@bizznex/shared';

const money = (n: number) => '$' + Math.round(n).toLocaleString('en-US');

/**
 * Brenda — a local, built-in assistant. Answers from the user's own BizzNex
 * data. No external API, no keys, no network calls.
 */
@Injectable()
export class AssistantService {
  constructor(private readonly prisma: PrismaService) {}

  async ask(userId: string, dto: AssistantAskInput): Promise<AssistantReply> {
    const q = dto.prompt.toLowerCase();

    const [deals, contacts, companies, projects, activities] = await Promise.all([
      this.prisma.deal.findMany({ where: { userId } }),
      this.prisma.contact.count({ where: { userId } }),
      this.prisma.company.count({ where: { userId } }),
      this.prisma.project.findMany({ where: { userId }, include: { tasks: true } }),
      this.prisma.activity.findMany({ where: { userId, done: false } }),
    ]);

    const tasks = projects.flatMap((p) => p.tasks);
    const openTasks = tasks.filter((t) => t.status !== 'Completed');

    // Deals / pipeline
    if (/deal|pipeline|sales|revenue|won/.test(q)) {
      if (!deals.length) return { configured: true, reply: 'You have no deals yet. Add one from the Deals view to start a pipeline.' };
      const open = deals.filter((d) => d.stage !== 'Won' && d.stage !== 'Lost');
      const pipeline = open.reduce((s, d) => s + d.value, 0);
      const won = deals.filter((d) => d.stage === 'Won');
      const wonValue = won.reduce((s, d) => s + d.value, 0);
      const byStage = ['Lead', 'Qualified', 'Proposal', 'Won', 'Lost']
        .map((st) => `${st}: ${deals.filter((d) => d.stage === st).length}`)
        .join(' · ');
      return {
        configured: true,
        reply: `You have ${deals.length} deals. Open pipeline is ${money(pipeline)} across ${open.length} deals; ${won.length} won (${money(wonValue)}).\nBy stage — ${byStage}.`,
      };
    }

    // Tasks / what's due
    if (/task|due|week|deadline|overdue|to.?do/.test(q)) {
      if (!openTasks.length) return { configured: true, reply: "You have no open tasks — you're all clear." };
      const soon = [...openTasks]
        .sort((a, b) => +new Date(a.endDate ?? 0) - +new Date(b.endDate ?? 0))
        .slice(0, 5)
        .map((t) => `• ${t.name}${t.endDate ? ` (due ${new Date(t.endDate).toLocaleDateString()})` : ''}`)
        .join('\n');
      return { configured: true, reply: `You have ${openTasks.length} open tasks. Next up:\n${soon}` };
    }

    // Contacts / companies
    if (/contact|customer|client|company|companies|people/.test(q)) {
      return { configured: true, reply: `You have ${contacts} contacts across ${companies} companies. Add or edit them in the Contacts and Companies views.` };
    }

    // Activities / follow-ups
    if (/activit|follow|call|meeting|email/.test(q)) {
      if (!activities.length) return { configured: true, reply: 'No open activities logged. Log calls, emails and meetings from the Activities view.' };
      const list = activities.slice(0, 5).map((a) => `• ${a.type}: ${a.subject}`).join('\n');
      return { configured: true, reply: `You have ${activities.length} open activities:\n${list}` };
    }

    // Overview / help / default
    return {
      configured: true,
      reply:
        `Hi, I'm Brenda — your built-in BizzNex assistant.\n` +
        `Snapshot: ${deals.length} deals, ${contacts} contacts, ${companies} companies, ${openTasks.length} open tasks.\n` +
        `Ask me about your "deals", "tasks due this week", "contacts", or "activities".`,
    };
  }
}
