import { BadRequestException } from '@nestjs/common';
import type { PrismaService } from '../prisma/prisma.service';

export interface LinkIds {
  contactId?: string | null;
  companyId?: string | null;
  dealId?: string | null;
}

/**
 * Records may only point at other records owned by the same user.
 * Without this, a user could attach someone else's contact or deal by guessing its id.
 */
export async function assertLinksOwned(prisma: PrismaService, userId: string, links: LinkIds): Promise<void> {
  const checks: Array<[string, Promise<unknown>]> = [];
  if (links.contactId) checks.push(['contact', prisma.contact.findFirst({ where: { id: links.contactId, userId }, select: { id: true } })]);
  if (links.companyId) checks.push(['company', prisma.company.findFirst({ where: { id: links.companyId, userId }, select: { id: true } })]);
  if (links.dealId) checks.push(['deal', prisma.deal.findFirst({ where: { id: links.dealId, userId }, select: { id: true } })]);
  const found = await Promise.all(checks.map(([, q]) => q));
  const missing = checks.filter((_, i) => !found[i]).map(([name]) => name);
  if (missing.length) throw new BadRequestException(`Linked ${missing.join(' and ')} not found.`);
}
