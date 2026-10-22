import { useLayoutEffect, useRef, useState } from 'react';
import type { KeyboardEvent as ReactKeyboardEvent, PointerEvent as ReactPointerEvent, ReactNode } from 'react';
import Icon from '../ui/Icon';
import ErrorBoundary from '../ui/ErrorBoundary';
import type { WinRec } from './useWindows';
import { animate, ghostExit, originRect, rectTransform } from '../ui/motion';

const DEFAULT_W = 280;
const DEFAULT_H = 380;
const MIN_W = 240;
const MIN_H = 200;

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(v, hi));
const dockItemFor = (id: WinRec['id']) => document.querySelector<HTMLElement>(`[data-dock="${id}"]`);

interface Props {
  rec: WinRec;
  title: string;
  focused: boolean;
  children: ReactNode;
  onFocus: () => void;
  onClose: () => void;
  onMinimize: () => void;
}

/** A draggable / resizable / minimisable floating window hosting a tool.
 *  Geometry is local state; only stacking + minimise flow back to useWindows. */
export default function ToolWindow({ rec, title, focused, children, onFocus, onClose, onMinimize }: Props) {
  const [pos, setPos] = useState({ x: rec.x, y: rec.y });
  const [size, setSize] = useState({ w: DEFAULT_W, h: DEFAULT_H });
  const drag = useRef<{ sx: number; sy: number; ox: number; oy: number } | null>(null);
  const rez = useRef<{ sx: number; sy: number; ow: number; oh: number } | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  // the window stays on screen while it shrinks into the dock, then hides
  const [shown, setShown] = useState(!rec.min);
  const [prevMin, setPrevMin] = useState(rec.min);
  if (prevMin !== rec.min) { setPrevMin(rec.min); if (!rec.min) setShown(true); }
  const wasMin = useRef(rec.min);
  const minAnim = useRef<Animation | null>(null);

  // open: grow out of the control that opened it; close: fade down where it stands.
  // Keyboard focus moves into the window, and back to whatever opened it when it closes.
  useLayoutEffect(() => {
    const el = ref.current!, born = performance.now();
    const opener = document.activeElement as HTMLElement | null;
    const src = originRect(), box = el.getBoundingClientRect();
    if (src) animate(el, [{ opacity: .3, transform: rectTransform(src, box) }, { opacity: 1, transform: 'none' }], 380);
    else animate(el, [{ opacity: 0, transform: 'scale(.96)' }, { opacity: 1, transform: 'none' }], 280);
    if (!wasMin.current) el.focus({ preventScroll: true });
    return () => {
      if (el.contains(document.activeElement) && opener?.isConnected) opener.focus({ preventScroll: true });
      if (performance.now() - born > 80) ghostExit(el, (g) => [animate(g, [{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'scale(.96)' }], 180)]);
    };
  }, []);

  // minimise into its dock item; restore back out of it. A restore mid-minimise cancels the shrink.
  useLayoutEffect(() => {
    if (wasMin.current === rec.min) return;
    wasMin.current = rec.min;
    const el = ref.current!;
    minAnim.current?.cancel();
    minAnim.current = null;
    if (rec.min) {
      const dock = dockItemFor(rec.id);
      if (el.contains(document.activeElement)) dock?.focus({ preventScroll: true });
      const target = dock?.getBoundingClientRect();
      const a = target ? animate(el, [{ opacity: 1, transform: 'none' }, { opacity: .2, transform: rectTransform(target, el.getBoundingClientRect()) }], 320) : null;
      minAnim.current = a;
      const hide = () => {
        if (!wasMin.current || (a && minAnim.current !== a)) return; // restored (or re-minimised) since
        minAnim.current = null;
        el.style.display = 'none';
        setShown(false);
      };
      if (a) a.finished.then(hide, hide); else hide();
    } else {
      el.style.display = '';
      const from = dockItemFor(rec.id)?.getBoundingClientRect();
      if (from) animate(el, [{ opacity: .3, transform: rectTransform(from, el.getBoundingClientRect()) }, { opacity: 1, transform: 'none' }], 380);
      el.focus({ preventScroll: true });
    }
  }, [rec.min, rec.id]);

  // Escape minimises the window it was pressed in (open modals catch Escape first, see ui/Modal)
  const onKeyDown = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'Escape' || e.defaultPrevented) return;
    e.preventDefault();
    onMinimize();
  };

  const onBarDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('.win-btn')) return;
    onFocus();
    drag.current = { sx: e.clientX, sy: e.clientY, ox: pos.x, oy: pos.y };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onBarMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d) return;
    setPos({
      x: clamp(d.ox + e.clientX - d.sx, 0, window.innerWidth - 60),
      y: clamp(d.oy + e.clientY - d.sy, 0, window.innerHeight - 44),
    });
  };
  const endDrag = () => { drag.current = null; };

  const onRzDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    onFocus();
    rez.current = { sx: e.clientX, sy: e.clientY, ow: size.w, oh: size.h };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onRzMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const r = rez.current;
    if (!r) return;
    setSize({
      w: Math.max(MIN_W, r.ow + e.clientX - r.sx),
      h: Math.max(MIN_H, r.oh + e.clientY - r.sy),
    });
  };
  const endRez = () => { rez.current = null; };

  return (
    // a (non-modal) dialog handles its own Escape key
    // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions
    <div
      ref={ref}
      className={focused ? 'win focused' : 'win'}
      style={{ left: pos.x, top: pos.y, width: size.w, height: size.h, zIndex: rec.z, display: shown || !rec.min ? 'flex' : 'none' }}
      onPointerDown={onFocus}
      onKeyDown={onKeyDown}
      role="dialog"
      aria-label={title}
      tabIndex={-1}
    >
      <div className="win-bar" onPointerDown={onBarDown} onPointerMove={onBarMove} onPointerUp={endDrag} onPointerCancel={endDrag}>
        <span className="wt">§ {title}</span>
        <div className="win-btns">
          <button className="win-btn" onClick={onMinimize} aria-label="Minimize"><Icon name="minus" size={13} /></button>
          <button className="win-btn" onClick={onClose} aria-label="Close"><Icon name="x" size={13} /></button>
        </div>
      </div>
      <div className="win-body"><ErrorBoundary what={title} compact>{children}</ErrorBoundary></div>
      <div className="win-rz" onPointerDown={onRzDown} onPointerMove={onRzMove} onPointerUp={endRez} onPointerCancel={endRez} />
    </div>
  );
}
