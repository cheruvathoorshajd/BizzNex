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

/* ── Calculator ── */
const CALC_OPS = '+−×÷';
/** A number as the calculator displays it; large/tiny results use e-notation ("1e+21"), which calc reads back. */
const NUM_RE = /^(\d+\.?\d*|\.\d+)(e[+-]?\d+)?/i;

/**
 * Evaluate a calculator expression: + − × ÷ (ASCII + - * / too), decimals, unary minus and
 * percent, parsed by hand (no eval). Percent works like a phone calculator: "200×10%" = 20,
 * "200+10%" = 220, "200−10%" = 180, and a lone "50%" = 0.5. Throws on anything malformed,
 * on division by zero and on non-finite results.
 */
export const calc = (expr: string): number => {
  const src = expr.replace(/\s+/g, '');
  let i = 0;
  const peek = () => src[i];
  const op = (chars: string) => {
    const c = src[i];
    if (c !== undefined && chars.includes(c)) { i++; return c; }
    return null;
  };

  // factor := ('-'|'+') factor | number '%'*
  const factor = (): { v: number; pct: boolean } => {
    const sign = op('−-+');
    if (sign) {
      const f = factor();
      return { v: sign === '+' ? f.v : -f.v, pct: f.pct };
    }
    const m = NUM_RE.exec(src.slice(i));
    if (!m) throw new Error('bad');
    i += m[0].length;
    let v = parseFloat(m[0]);
    let pct = false;
    while (op('%')) { v /= 100; pct = true; }
    return { v, pct };
  };

  // term := factor (('×'|'÷') factor)*; `pct` = the whole term is a lone "b%"
  const term = () => {
    let { v, pct } = factor();
    let o: string | null;
    while ((o = op('×÷*/'))) {
      const r = factor().v;
      if ((o === '÷' || o === '/') && r === 0) throw new Error('bad');
      v = o === '×' || o === '*' ? v * r : v / r;
      pct = false;
    }
    return { v, pct };
  };

  // expr := term (('+'|'−') term)*; "a + b%" adds b% of a
  let acc = term().v;
  let o: string | null;
  while ((o = op('+−-'))) {
    const t = term();
    const r = t.pct ? acc * t.v : t.v;
    acc = o === '+' ? acc + r : acc - r;
  }
  if (peek() !== undefined || !Number.isFinite(acc)) throw new Error('bad');
  // drop float noise (0.1+0.2 → 0.3); toFixed only works below 1e21
  return Math.abs(acc) < 1e21 ? parseFloat(acc.toFixed(10)) : acc;
};

/**
 * The calculator display after pressing `key` (a digit, '.', '%' or an operator).
 * `fresh` = the display holds a result just shown by '=': a digit starts a new
 * expression, an operator carries on from the result. Keeps input parseable:
 * one decimal point per number, no stacked operators (except a unary minus).
 */
export function calcInput(expr: string, key: string, fresh = false): string {
  let e = expr === 'Error' ? '' : expr;
  const isOp = CALC_OPS.includes(key);
  if (fresh && !isOp && key !== '%') e = '';
  const last = e.slice(-1);
  if (isOp) {
    if (!e) return key === '−' ? '−' : e;
    if (CALC_OPS.includes(last)) {
      const prev = e.slice(-2, -1);
      if (key === '−' && !CALC_OPS.includes(prev) && e.length > 1) return e + key; // "5×−3"
      const trimmed = e.replace(/[+−×÷]+$/, '');
      return trimmed ? trimmed + key : key === '−' ? '−' : '';
    }
    return e + key;
  }
  if (key === '%') return /[\d.]$/.test(e) ? e + key : e;
  const current = /\d*\.?\d*(e[+-]?\d*)?$/i.exec(e)?.[0] ?? ''; // the number being typed
  if (key === '.') {
    if (current.includes('.') || /e/i.test(current)) return e;
    return e + (current === '' ? '0.' : '.');
  }
  if (last === '%') return e; // "10%5" is not a number
  return e + key;
}
