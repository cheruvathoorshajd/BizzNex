import { useEffect, useState, useSyncExternalStore } from 'react';
import type { CSSProperties } from 'react';
import { SkylineMark } from './Logo';
import { MOTION_SCALE, reducedMotion } from './motion';
import { cx } from '../utils';
import timing from './transition-timing.json';

/**
 * Transition screens between the big moments (design-style-guides/bizznex-transitions.html,
 * decided 29 Oct 2026):
 * - Skyline for the ways in: opening the app, signing in, the demo, finishing setup.
 *   The mark draws itself, its window lights, then the screen lifts away.
 * - Aurora for everything else: signing out, a session ending, page loads and switching
 *   features. The mesh blooms in, then fades through paper: words, then glow, then the page.
 * One screen at a time; a request made while one is playing just applies its change.
 */
export type TransitionKind = 'skyline' | 'aurora';
export interface TransitionScreen {
  kind: TransitionKind;
  t: string;
  s?: string;
  /** Cover only the main column (the sidebar stays): switching features. */
  inline?: boolean;
  /** Short timings, for switching features. */
  compact?: boolean;
}
export type TransitionPhase = 'in' | 'hold' | 'out';
interface Playing extends TransitionScreen { id: number; phase: TransitionPhase; calm: boolean; ms: Timing }
interface Timing { in: number; hold: number; out: number }

/**
 * Base timings (ms) before the motion scale, from transition-timing.json: the one source the
 * landing player imports and the case study's player is given at build (vite.config.ts), with
 * designDrift.test.ts guarding the case study's own fallback copy. "in" covers the entrance,
 * "out" the exit; compact (switching features) holds ≈0.5 s at ×1.5. calm = reduced motion,
 * a short cross-fade with the same words.
 */
const TIMING: Record<'skyline' | 'aurora' | 'compact', Timing> = timing;
const CALM: Timing = timing.calm;

export function timingFor(screen: Pick<TransitionScreen, 'kind' | 'compact'>, calm = false): Timing {
  if (calm) return CALM;
  const base = screen.compact ? TIMING.compact : TIMING[screen.kind];
  return { in: base.in * MOTION_SCALE, hold: base.hold * MOTION_SCALE, out: base.out * MOTION_SCALE };
}

let playing: Playing | null = null;
let seq = 0;
const listeners = new Set<() => void>();
const set = (next: Playing | null) => { playing = next; listeners.forEach((l) => l()); };
const subscribe = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l); }; };
const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
/** The live value (TypeScript would otherwise keep the narrowing from before an await). */
const current = (): Playing | null => playing;

/** True while a transition screen is on: the 401 handler uses it to end a session only once. */
export const transitionPlaying = () => playing !== null;

/**
 * Cover the screen, run `swap` (the state change) once it is covered, wait for `ready` and the
 * minimum hold, then play the exit. With `showAfter`, nothing shows if `ready` settles sooner
 * (no flash for quick waits).
 */
export async function playTransition(
  screen: TransitionScreen,
  { swap, ready, showAfter = 0 }: { swap?: () => void; ready?: Promise<unknown>; showAfter?: number } = {},
): Promise<void> {
  if (playing) { swap?.(); await ready?.catch(() => {}); return; }
  const calm = reducedMotion();
  if (screen.compact && calm) { swap?.(); return; }
  if (showAfter && ready) {
    const quick = await Promise.race([ready.then(() => true, () => true), sleep(showAfter).then(() => false)]);
    if (quick) { swap?.(); return; }
  }
  const id = ++seq;
  const ms = timingFor(screen, calm);
  set({ ...screen, id, phase: 'in', calm, ms });
  await sleep(ms.in);
  swap?.();
  let p = current();
  if (p?.id === id) set({ ...p, phase: 'hold' });
  await Promise.all([sleep(ms.hold), ready?.catch(() => {})]);
  p = current();
  if (p?.id === id) set({ ...p, phase: 'out' });
  await sleep(ms.out);
  if (current()?.id === id) set(null);
}

/** "morning" | "afternoon" | "evening" for greetings (i18n/translate.ts builds the words). */
export const dayPart = (h = new Date().getHours()) => (h < 12 ? 'morning' : h < 18 ? 'afternoon' : 'evening');

interface ViewProps extends TransitionScreen {
  phase: TransitionPhase;
  calm?: boolean;
  ms: Timing;
  /** Sit inside a container (the landing page's player) instead of covering the window. */
  contained?: boolean;
  className?: string;
}

/** The screen itself, driven by `phase`. Used by the app's host and by the landing page's player. */
export function TransitionView({ kind, t, s, inline, compact, phase, calm, ms, contained, className }: ViewProps) {
  const style = { '--txs-in': `${ms.in}ms`, '--txs-hold': `${ms.hold}ms`, '--txs-out': `${ms.out}ms` } as CSSProperties;
  return (
    <div
      className={cx('txs', `txs-${kind}`, `is-${phase}`, inline && 'txs-inline', compact && 'txs-compact', calm && 'txs-calm', contained && 'txs-contained', className)}
      style={style} role="status" aria-live="polite"
    >
      {kind === 'aurora' && <span className="txs-mesh" aria-hidden="true" />}
      {kind === 'skyline' && <SkylineMark drawn className="txs-mark" />}
      <span className="txs-t">{t}</span>
      {s && <span className="txs-s">{s}</span>}
    </div>
  );
}

/** Renders whichever transition is playing. Mounted once, above the signed-in/signed-out switch. */
export function TransitionHost() {
  const p = useSyncExternalStore(subscribe, () => playing);
  return p ? <TransitionView {...p} /> : null;
}

/** A page whose code is still loading: an Aurora panel in the main column, after 300 ms. */
export function PageLoading({ label }: { label: string }) {
  const [shown, setShown] = useState(false);
  useEffect(() => { const id = setTimeout(() => setShown(true), 300); return () => clearTimeout(id); }, []);
  if (!shown) return null;
  return <TransitionView kind="aurora" t={label} phase="hold" ms={timingFor({ kind: 'aurora' }, reducedMotion())} calm={reducedMotion()} className="txs-panel" />;
}
