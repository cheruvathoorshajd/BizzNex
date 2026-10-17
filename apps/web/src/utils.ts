/** Small shared helpers. */

export const cx = (...c: (string | false | undefined | null)[]) => c.filter(Boolean).join(' ');

/*
 * Two kinds of dates. Calendar dates (due dates, event days, note dates) come from a date input
 * and are stored as UTC midnight, so they are always read back in UTC: otherwise anyone west of
 * Greenwich sees the day before. Timestamps (created, sent, published) are moments, shown in local time.
 */

/** Calendar date ISO string → "YYYY-MM-DD" for a date input. */
export const toDateInput = (iso?: string | null) => (iso ? iso.slice(0, 10) : '');

/** Date input value → UTC-midnight ISO string, or null when empty. */
export const fromDateInput = (v: string): string | null => (v ? `${v}T00:00:00.000Z` : null);

/** Today in the user's own time zone, as a date input value. */
export const todayInput = () => {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
};

/** A timestamp, in local time. */
export const fmtDate = (iso: string) => {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
};

/** A timestamp with its time, in local time. */
export const fmtDateTime = (iso: string) => {
  if (!iso) return '';
  return new Date(iso).toLocaleString(undefined, { day: '2-digit', month: 'short', hour: 'numeric', minute: '2-digit' });
};

/** Now, as a datetime-local input value in the user's time zone. */
export const nowLocal = () => {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
};

/** A calendar date, e.g. "16 Oct 2026". */
export const fmtDay = (iso: string) => {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' });
};

/** A calendar date, short form, e.g. "OCT 16". */
export const fmtShort = (iso: string) => {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: '2-digit', timeZone: 'UTC' }).toUpperCase();
};

export type StatusDot = 'done' | 'progress' | 'pending';
export const dotClass = (s: string): StatusDot => (s === 'Completed' ? 'done' : s === 'In Progress' ? 'progress' : 'pending');

export const fmtMoney = (n: number) => '$' + Math.round(n).toLocaleString('en-US');

/** Build an SVG polyline "points" string from a series, fitted to a box. */
export const sparkPoints = (series: number[], w = 84, h = 24, pad = 3) => {
  if (!series.length) return '';
  const max = Math.max(...series), min = Math.min(...series);
  const span = max - min || 1;
  const step = (w - pad * 2) / (series.length - 1 || 1);
  return series
    .map((v, i) => {
      const x = pad + i * step;
      const y = pad + (1 - (v - min) / span) * (h - pad * 2);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
};

/**
 * Evaluate a calculator expression. `%` means percent ("200×10%" = 20), as on any
 * desk calculator, not modulo. Only digits and operators reach `Function`, so it can't run code.
 */
export const calc = (expr: string): number => {
  const s = expr.replace(/×/g, '*').replace(/÷/g, '/').replace(/−/g, '-')
    .replace(/(\d+(?:\.\d+)?)%/g, '($1/100)');
  if (!/^[0-9+\-*/.()\s]+$/.test(s)) throw new Error('bad');
  const r = Function('"use strict"; return (' + s + ')')();
  if (r === undefined || !Number.isFinite(r)) throw new Error('bad');
  return Math.round(r * 1e10) / 1e10;
};
