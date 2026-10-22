import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { TEAM_SIZES } from '@bizznex/shared';
import type { CompanyMatch, Industry, TeamSize } from '@bizznex/shared';

const WIKIDATA = 'https://www.wikidata.org/w/api.php';
// Wikimedia asks every client to identify itself
const HEADERS = { 'User-Agent': 'BizzNex/1.0 (https://github.com/cheruvathoorshajd/BizzNex)' };
/** One budget for the whole search, across its sequential calls. */
const BUDGET_MS = 5000;
const CACHE_MS = 10 * 60_000;
/** After a failure, answer from memory for a moment instead of hammering a struggling API. */
const FAIL_CACHE_MS = 30_000;
const UNAVAILABLE = 'Company search isn’t available right now. You can fill in the details yourself.';

/**
 * Source wording → BizzNex industry. First match wins, so the more specific rules come first.
 * Every alternative starts at a word boundary, so "transport" isn't "sport" and "storage" isn't "store".
 */
const INDUSTRY_RULES: [RegExp, Industry][] = [
  [/\b(financ|bank|insur|payment|invest|fintech|accounting)/, 'Finance & insurance'],
  [/\breal estate|(?<!intellectual )\bpropert(y|ies)\b/, 'Real estate'],
  [/\b(restaurant|food|coffee|beverage|drink|hospitality|hotel|catering|brew|bakery|café|cafe)/, 'Food & hospitality'],
  [/\b(retail|e-?commerce|electronic commerce|commerce\b|clothing|fashion|apparel|stores?\b|shops?\b|shopping|grocer|consumer goods)/, 'Retail & e-commerce'],
  [/\b(software|technolog|internet|computer|video game|information technology|information services|telecom|semiconductor|electronics|artificial intelligence|machine learning)/, 'Technology & software'],
  [/\b(advertis|marketing|design|media\b|creative|public relations|publishing|branding)/, 'Marketing & creative'],
  [/\b(consult|legal|law\b|law firm|professional service|staffing|recruit)/, 'Professional services'],
  [/\b(event|entertainment|music|film|sports?\b|sporting|gaming|leisure)/, 'Events & entertainment'],
  [/\b(construct|building|architect|civil engineering|plumb|electrical contract)/, 'Construction & trades'],
  [/\b(health|medic|pharma|wellness|fitness|hospital|dental)/, 'Health & wellness'],
  [/\b(educat|training|school|universit|learning)/, 'Education & training'],
  [/\b(manufactur|industrial|automotive|chemical|aerospace|machinery|textile)/, 'Manufacturing'],
  [/\b(non-profit|nonprofit|charity|charitable|foundation\b|ngo\b)/, 'Non-profit'],
];

export const mapIndustry = (labels: string[]): Industry | null => {
  for (const label of labels) {
    const l = label.toLowerCase();
    const hit = INDUSTRY_RULES.find(([re]) => re.test(l));
    if (hit) return hit[1];
  }
  return null;
};

export const teamSizeFor = (n: number | null): TeamSize | null => {
  if (n == null || !Number.isFinite(n) || n < 1) return null;
  const [one, small, mid, large, huge] = TEAM_SIZES;
  return n === 1 ? one : n <= 10 ? small : n <= 50 ? mid : n <= 200 ? large : huge;
};

interface Statement {
  rank?: 'preferred' | 'normal' | 'deprecated';
  mainsnak?: { datavalue?: { value?: any } };
  qualifiers?: Record<string, { datavalue?: { value?: any } }[] | undefined>;
}
type Claims = Record<string, Statement[] | undefined>;
interface Entity { id: string; labels?: Record<string, { value: string }>; descriptions?: Record<string, { value: string }>; claims?: Claims }

/** "+2023-01-01T00:00:00Z" from the P585 (point in time) qualifier; '' when there is none. */
const pointInTime = (s: Statement): string => String(s.qualifiers?.P585?.[0]?.datavalue?.value?.time ?? '').replace(/^\+/, '');

/**
 * A property's statements in Wikidata's own order of trust: deprecated ones dropped, preferred
 * ones only when there are any, otherwise the most recent first by their point in time.
 */
export const statements = (c: Claims, p: string): Statement[] => {
  const live = (c[p] ?? []).filter((s) => s.rank !== 'deprecated');
  const preferred = live.filter((s) => s.rank === 'preferred');
  const pool = preferred.length ? preferred : live;
  return [...pool].sort((a, b) => pointInTime(b).localeCompare(pointInTime(a)));
};
const first = (c: Claims, p: string) => statements(c, p)[0]?.mainsnak?.datavalue?.value;
const ids = (c: Claims, p: string): string[] => statements(c, p).map((x) => x.mainsnak?.datavalue?.value?.id).filter(Boolean);
const domainOf = (url: string | null) => {
  if (!url) return null;
  try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return null; }
};

/**
 * Finds companies by name in Wikidata's public API (free, no key, CC0 data) and maps what it
 * knows onto the onboarding profile. Well-known companies only: most small businesses aren't
 * listed, so callers treat this as a shortcut, never a requirement. Logos come only from the
 * company's Wikidata logo (P154), served by Wikimedia Commons.
 */
@Injectable()
export class LookupService {
  private readonly logger = new Logger('Lookup');
  private readonly cache = new Map<string, { at: number; data: CompanyMatch[] }>();
  private readonly failed = new Map<string, number>();
  private readonly inFlight = new Map<string, Promise<CompanyMatch[]>>();

  private async call(params: Record<string, string>, signal: AbortSignal): Promise<any> {
    const url = `${WIKIDATA}?${new URLSearchParams({ format: 'json', ...params })}`;
    const res = await fetch(url, { headers: HEADERS, signal });
    if (!res.ok) throw new Error(`Wikidata ${res.status}`);
    return res.json();
  }

  async companies(query: string): Promise<CompanyMatch[]> {
    const q = query.trim().replace(/\s+/g, ' ');
    if (q.length < 2) return [];
    const key = q.toLowerCase();
    const hit = this.cache.get(key);
    if (hit && Date.now() - hit.at < CACHE_MS) return hit.data;
    if (Date.now() - (this.failed.get(key) ?? 0) < FAIL_CACHE_MS) throw new ServiceUnavailableException(UNAVAILABLE);

    // identical searches already on their way share one answer
    let pending = this.inFlight.get(key);
    if (!pending) {
      pending = this.search(q, key).finally(() => this.inFlight.delete(key));
      this.inFlight.set(key, pending);
    }
    return pending;
  }

  private async search(q: string, key: string): Promise<CompanyMatch[]> {
    const signal = AbortSignal.timeout(BUDGET_MS);
    try {
      const found = await this.call({ action: 'wbsearchentities', search: q, language: 'en', uselang: 'en', type: 'item', limit: '20' }, signal);
      const candidates: string[] = (found.search ?? []).map((s: { id: string }) => s.id);
      if (!candidates.length) return this.remember(key, []);

      const detail = await this.call({ action: 'wbgetentities', ids: candidates.join('|'), props: 'labels|descriptions|claims', languages: 'en' }, signal);
      // a company has an industry or a headcount; places, people and species don't
      const companies = candidates
        .map((id) => detail.entities?.[id] as Entity | undefined)
        .filter((e): e is Entity => !!e?.claims && !!(statements(e.claims, 'P452').length || statements(e.claims, 'P1128').length))
        .slice(0, 6);
      if (!companies.length) return this.remember(key, []);

      const countries = [...new Set(companies.map((e) => ids(e.claims!, 'P17')[0]).filter(Boolean))];
      const refs = [...new Set([...companies.flatMap((e) => ids(e.claims!, 'P452')), ...countries])];
      const names: Record<string, string> = {};
      const iso: Record<string, string> = {};
      await Promise.all([
        refs.length && this.call({ action: 'wbgetentities', ids: refs.slice(0, 50).join('|'), props: 'labels', languages: 'en' }, signal)
          .then((labels) => { for (const [id, e] of Object.entries<Entity>(labels.entities ?? {})) if (e.labels?.en) names[id] = e.labels.en.value; }),
        // the country's ISO 3166-1 code (P297), so the profile doesn't depend on matching its English name
        ...countries.map((id) => this.call({ action: 'wbgetclaims', entity: id, property: 'P297' }, signal)
          .then((r) => { const code = first(r.claims ?? {}, 'P297'); if (typeof code === 'string' && /^[A-Z]{2}$/.test(code)) iso[id] = code; })
          .catch(() => undefined)), // optional: the web falls back to the country's name
      ]);

      const data = companies.map((e): CompanyMatch => {
        const c = e.claims!;
        const website: string | null = first(c, 'P856') ?? null;
        const industryLabels = ids(c, 'P452').map((id) => names[id]).filter(Boolean);
        const amount = first(c, 'P1128')?.amount;
        const employees = amount != null ? Math.round(Number(amount)) : null;
        const logo: string | undefined = first(c, 'P154');
        const country = ids(c, 'P17')[0];
        return {
          id: e.id,
          name: e.labels?.en?.value ?? e.id,
          description: e.descriptions?.en?.value ?? '',
          website,
          domain: domainOf(website),
          industryLabel: industryLabels[0] ?? null,
          industry: mapIndustry(industryLabels),
          employees,
          teamSize: teamSizeFor(employees),
          country: names[country] ?? null,
          countryCode: iso[country] ?? null,
          logoUrl: logo ? `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(logo)}?width=96` : null,
        };
      });
      return this.remember(key, data);
    } catch (err) {
      // never log what was typed: it can be a person's own business name
      this.logger.warn(`company lookup failed: ${(err as Error).message}`);
      if (this.failed.size > 300) this.failed.delete(this.failed.keys().next().value as string);
      this.failed.set(key, Date.now());
      throw new ServiceUnavailableException(UNAVAILABLE);
    }
  }

  private remember(key: string, data: CompanyMatch[]) {
    if (this.cache.size > 300) this.cache.delete(this.cache.keys().next().value as string);
    this.cache.set(key, { at: Date.now(), data });
    this.failed.delete(key);
    return data;
  }
}
