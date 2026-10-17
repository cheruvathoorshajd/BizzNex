import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import type { ViewId } from '../types';
import Icon from '../ui/Icon';
import { TOUR as ALL_STEPS } from './content';
import { useOnboarding } from './useOnboarding';

interface Props {
  onNavigate: (v: ViewId) => void;
  onClose: (completed: boolean) => void;
  /** Tells the shell which element is about to be spotlit (e.g. to slide the mobile sidebar in). */
  onTarget?: (key: string | undefined) => void;
}

type Rect = { top: number; left: number; width: number; height: number };
const PAD = 8;
const CARD_W = 340;

/** Find a visible element for a `data-tour` key (hidden elements, e.g. the mobile sidebar, fall back to a centred card). */
function measure(key?: string): Rect | null {
  if (!key) return null;
  const el = document.querySelector<HTMLElement>(`[data-tour="${key}"]`);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  const visible = r.width > 0 && r.height > 0 && r.right > 0 && r.left < window.innerWidth && r.bottom > 0 && r.top < window.innerHeight;
  return visible ? { top: r.top - PAD, left: r.left - PAD, width: r.width + PAD * 2, height: r.height + PAD * 2 } : null;
}

/** Place the card next to the spotlight: right of it if there's room, else below, else above. */
function place(rect: Rect | null, cardH: number): CSSProperties {
  const vw = window.innerWidth, vh = window.innerHeight, gap = 14;
  const w = Math.min(CARD_W, vw - 32);
  if (!rect || vw < 560) {
    return rect && vw < 560
      ? { width: w, left: 16, top: rect.top + rect.height + gap + cardH < vh ? rect.top + rect.height + gap : Math.max(16, rect.top - cardH - gap) }
      : { width: w, left: (vw - w) / 2, top: Math.max(16, (vh - cardH) / 2) };
  }
  const clampTop = (t: number) => Math.min(Math.max(16, t), vh - cardH - 16);
  const clampLeft = (l: number) => Math.min(Math.max(16, l), vw - w - 16);
  if (rect.left + rect.width + gap + w < vw - 16) return { width: w, left: rect.left + rect.width + gap, top: clampTop(rect.top) };
  if (rect.top + rect.height + gap + cardH < vh - 16) return { width: w, left: clampLeft(rect.left + rect.width - w), top: rect.top + rect.height + gap };
  return { width: w, left: clampLeft(rect.left + rect.width - w), top: Math.max(16, rect.top - cardH - gap) };
}

export default function Tour({ onNavigate, onClose, onTarget }: Props) {
  const { guided } = useOnboarding();
  const TOUR = guided ? ALL_STEPS : ALL_STEPS.filter((s) => !s.guidedOnly);
  const [i, setI] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);
  const [cardH, setCardH] = useState(200);
  const cardRef = useRef<HTMLDivElement>(null);
  const step = TOUR[i];
  const last = i === TOUR.length - 1;

  const go = useCallback((n: number) => setI(Math.max(0, Math.min(TOUR.length - 1, n))), [TOUR.length]);

  // Navigate first (so the target exists), then keep the spotlight glued to it while things settle/scroll/resize.
  useEffect(() => { if (step.view) onNavigate(step.view); onTarget?.(step.target); }, [i]);

  useEffect(() => {
    // only scroll vertically, and only to on-screen elements; scrolling to the off-canvas mobile sidebar would shift the page sideways
    const el = step.target ? document.querySelector<HTMLElement>(`[data-tour="${step.target}"]`) : null;
    const r = el?.getBoundingClientRect();
    if (el && r && r.left >= 0 && r.right <= window.innerWidth && (r.top < 0 || r.bottom > window.innerHeight)) {
      el.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    }
    let raf = 0;
    const tick = () => {
      setRect((prev) => {
        const r = measure(step.target);
        if (!r || !prev) return r;
        return Math.abs(r.top - prev.top) + Math.abs(r.left - prev.left) + Math.abs(r.width - prev.width) + Math.abs(r.height - prev.height) < 1 ? prev : r;
      });
      raf = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(raf);
  }, [step.target, i]);

  useLayoutEffect(() => { if (cardRef.current) setCardH(cardRef.current.offsetHeight); }, [i, rect?.width]);
  useEffect(() => { cardRef.current?.querySelector<HTMLElement>('.btn.primary')?.focus(); }, [i]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); onClose(false); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); if (last) onClose(true); else go(i + 1); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); go(i - 1); }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [i, last, go, onClose]);

  return (
    <div className="tour" role="dialog" aria-modal="true" aria-labelledby="tour-t" aria-describedby="tour-b">
      {/* the spotlight's giant box-shadow is the dimmed backdrop; with no target, a plain scrim */}
      {rect
        ? <div className="tour-spot" style={{ top: rect.top, left: rect.left, width: rect.width, height: rect.height }} />
        : <div className="tour-scrim" />}
      <div className="tour-block" onMouseDown={(e) => e.preventDefault()} />

      <div className="tour-card" ref={cardRef} style={place(rect, cardH)}>
        <div className="row between">
          <span className="spec"><span className="k">Tour</span><span className="num">{String(i + 1).padStart(2, '0')} / {String(TOUR.length).padStart(2, '0')}</span></span>
          <button className="x-btn" onClick={() => onClose(false)} aria-label="Close tour">×</button>
        </div>
        <h3 id="tour-t">{step.title}</h3>
        <p id="tour-b">{step.body}</p>
        <div className="tour-foot">
          <div className="tour-dots" aria-hidden="true">
            {TOUR.map((_, n) => <i key={n} className={n === i ? 'on' : n < i ? 'done' : ''} />)}
          </div>
          <div className="row gap-2">
            {i > 0 && <button className="btn quiet sm" onClick={() => go(i - 1)}>Back</button>}
            <button className="btn primary sm" onClick={() => (last ? onClose(true) : go(i + 1))}>
              {last ? 'Finish' : i === 0 ? 'Start' : 'Next'} {!last && <Icon name="arrow" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
