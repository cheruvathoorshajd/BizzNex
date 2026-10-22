/**
 * BizzNex motion: the "Spatial" direction from design-style-guides/bizznex-motion.html.
 * Things travel to and from where they belong. Pages slide the way you navigate,
 * dialogs grow out of the button you pressed, windows come from the sidebar and go
 * into the dock, and dark mode spreads from its switch.
 *
 * MOTION_SCALE stretches every duration. 1.5 = the study's timings played half again
 * as slowly (picked 16 Oct 2026). CSS reads the same number as `--m` (aurora.scss).
 */
import { flushSync } from 'react-dom';
import autoAnimate from '@formkit/auto-animate';
import type { AutoAnimationPlugin } from '@formkit/auto-animate';

export const MOTION_SCALE = 1.5;
export const EASE = 'cubic-bezier(.2, .8, .2, 1)';
export const SPRING = 'cubic-bezier(.34, 1.56, .64, 1)';

/** A duration from the study, scaled. */
export const dur = (ms: number) => Math.round(ms * MOTION_SCALE);

/** People who ask their OS for less motion get none of this, only instant changes. */
export const reducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Element.animate with the house easing, a no-op under reduced motion. */
export function animate(
  el: Element,
  frames: Keyframe[],
  ms: number,
  { easing = EASE, delay = 0 }: { easing?: string; delay?: number } = {},
): Animation | null {
  if (reducedMotion() || !el.animate) return null;
  const a = el.animate(frames, { duration: dur(ms), delay: dur(delay), easing, fill: 'both' });
  a.finished.then(() => a.cancel()).catch(() => {});
  return a;
}

/* ── where the user last pressed: dialogs and windows grow out of that point ── */
let lastPress = { x: 0, y: 0, t: -Infinity };
if (typeof window !== 'undefined') {
  window.addEventListener('pointerdown', (e) => { lastPress = { x: e.clientX, y: e.clientY, t: performance.now() }; }, true);
}

/** The point an opening surface should grow from: the click, else the focused control, else null. */
export function originPoint(): { x: number; y: number } | null {
  if (performance.now() - lastPress.t < 1500) return { x: lastPress.x, y: lastPress.y };
  const el = document.activeElement as HTMLElement | null;
  if (el && el !== document.body) {
    const r = el.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  }
  return null;
}

/** The rect of the control that opened something (for windows growing out of it). */
export function originRect(): DOMRect | null {
  const el = document.activeElement as HTMLElement | null;
  return el && el !== document.body ? el.getBoundingClientRect() : null;
}

/** A transform that maps `to` onto `from`, for FLIP-style "come from there" animations. */
export const rectTransform = (from: DOMRect, to: DOMRect) =>
  `translate(${from.left - to.left}px, ${from.top - to.top}px) scale(${from.width / to.width}, ${from.height / to.height})`;

/**
 * Animate a surface out after React has removed it: a copy is put back exactly where it
 * was and animated away. This covers every way of closing (button, Escape, backdrop)
 * without each caller having to wait for an exit animation.
 */
export function ghostExit(node: HTMLElement | null, run: (ghost: HTMLElement) => (Animation | null)[]) {
  if (!node || !node.isConnected || reducedMotion()) return;
  // call from a layout-effect cleanup: the node is still in the page, so its box can be copied
  const r = node.getBoundingClientRect();
  const z = getComputedStyle(node).zIndex;
  const ghost = node.cloneNode(true) as HTMLElement;
  ghost.setAttribute('aria-hidden', 'true');
  ghost.classList.add('motion-ghost');
  ghost.inert = true; // a picture of what was there: nothing in it can be clicked, focused or read out
  Object.assign(ghost.style, {
    position: 'fixed', left: `${r.left}px`, top: `${r.top}px`, width: `${r.width}px`, height: `${r.height}px`,
    right: 'auto', bottom: 'auto', margin: '0', zIndex: z === 'auto' ? '100' : z, pointerEvents: 'none',
  });
  ghost.removeAttribute('id');
  ghost.querySelectorAll('[id]').forEach((n) => n.removeAttribute('id'));
  document.body.appendChild(ghost);
  const anims = run(ghost).filter(Boolean) as Animation[];
  if (!anims.length) { ghost.remove(); return; }
  Promise.allSettled(anims.map((a) => a.finished)).then(() => ghost.remove());
}

/* ── View Transitions (pages, theme) ── */
type VTDoc = Document & { startViewTransition?: (cb: () => void) => { ready: Promise<void>; finished: Promise<void> } };

/**
 * Run a state change as a view transition. `kind` selects the CSS in aurora.scss
 * (`html[data-vt=…]`). Browsers without the API, and reduced motion, just apply the change.
 */
export function viewTransition(update: () => void, kind: 'nav-fwd' | 'nav-back' | 'theme', onReady?: () => void) {
  const doc = document as VTDoc;
  if (!doc.startViewTransition || reducedMotion()) { update(); return; }
  const root = document.documentElement;
  root.dataset.vt = kind;
  const vt = doc.startViewTransition(() => flushSync(update));
  vt.ready.then(() => onReady?.()).catch(() => {});
  vt.finished.finally(() => { if (root.dataset.vt === kind) delete root.dataset.vt; });
}

/**
 * Switch the theme with the new palette spreading in a circle from the switch.
 * `apply` must change `data-theme` synchronously so the new snapshot has the new colours.
 */
export function themeReveal(from: HTMLElement | null, apply: () => void) {
  const r = from?.getBoundingClientRect();
  const x = r ? r.left + r.width / 2 : window.innerWidth - 40;
  const y = r ? r.top + r.height / 2 : 40;
  const radius = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));
  viewTransition(apply, 'theme', () => {
    document.documentElement.animate(
      { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
      { duration: dur(560), easing: EASE, pseudoElement: '::view-transition-new(root)' } as KeyframeAnimationOptions,
    );
  });
}

/* ── lists: rows slide in from the left, out to the right, the rest glide into place ── */
export const rowMotion: AutoAnimationPlugin = (el, action, newCoords, oldCoords) => {
  if (reducedMotion()) return new KeyframeEffect(el, [], { duration: 0 });
  if (action === 'add') {
    return new KeyframeEffect(el, [{ opacity: 0, transform: 'translateX(-18px)' }, { opacity: 1, transform: 'none' }],
      { duration: dur(320), easing: EASE, delay: dur(60) });
  }
  if (action === 'remove') {
    return new KeyframeEffect(el, [{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'translateX(24px)' }],
      { duration: dur(200), easing: EASE });
  }
  const dx = (oldCoords?.left ?? 0) - (newCoords?.left ?? 0);
  const dy = (oldCoords?.top ?? 0) - (newCoords?.top ?? 0);
  return new KeyframeEffect(el, [{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'none' }],
    { duration: dur(320), easing: EASE });
};

const animatedLists = new WeakSet<Element>();
/** `ref={rows}` on a list's parent: its children animate in, out and into place. Stable, so it works inside loops. */
export const rows = (el: HTMLElement | null) => {
  if (!el || animatedLists.has(el)) return;
  animatedLists.add(el);
  autoAnimate(el, rowMotion);
};

/* ── numbers: count up to their value, slowing at the end ── */
export function countTo(from: number, to: number, ms: number, onFrame: (v: number) => void): () => void {
  if (reducedMotion() || from === to) { onFrame(to); return () => {}; }
  const t0 = performance.now(), D = dur(ms);
  let raf = requestAnimationFrame(function step(now) {
    const t = Math.min(1, (now - t0) / D);
    onFrame(from + (to - from) * (1 - Math.pow(1 - t, 5)));
    if (t < 1) raf = requestAnimationFrame(step);
  });
  return () => cancelAnimationFrame(raf);
}
