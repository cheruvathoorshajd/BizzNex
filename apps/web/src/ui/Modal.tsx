import { useLayoutEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { cx } from '../utils';
import { animate, ghostExit, originPoint } from './motion';

interface Props {
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  wide?: boolean;
}

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** Open dialogs, newest last: Escape closes only the top one. */
const stack: HTMLElement[] = [];

export default function Modal({ title, onClose, children, footer, wide }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const overlay = useRef<HTMLDivElement>(null);
  const close = useRef(onClose);
  close.current = onClose;

  useLayoutEffect(() => {
    const dialog = ref.current!;
    const opener = document.activeElement as HTMLElement | null;
    const born = performance.now();
    stack.push(dialog);

    // grow out of the button that opened it, and shrink back into it on close
    const p = originPoint();
    if (p) {
      const d = dialog.getBoundingClientRect();
      dialog.style.transformOrigin = `${p.x - d.left}px ${p.y - d.top}px`;
    }
    animate(overlay.current!, [{ opacity: 0 }, { opacity: 1 }], 200);
    animate(dialog, [{ opacity: 0, transform: 'scale(.5)' }, { opacity: 1, transform: 'none' }], 340);

    const first = dialog.querySelector<HTMLElement>('[data-autofocus]') ?? dialog.querySelector<HTMLElement>('input, select, textarea') ?? dialog.querySelector<HTMLElement>(FOCUSABLE);
    first?.focus({ preventScroll: true });

    const onKey = (e: KeyboardEvent) => {
      if (stack[stack.length - 1] !== dialog) return;
      if (e.key === 'Escape') { e.stopImmediatePropagation(); close.current(); return; }
      if (e.key !== 'Tab') return;
      // keep keyboard focus inside the dialog
      const items = [...dialog.querySelectorAll<HTMLElement>(FOCUSABLE)];
      if (!items.length) return;
      const [a, z] = [items[0], items[items.length - 1]];
      if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z.focus(); }
      else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus(); }
    };
    window.addEventListener('keydown', onKey, true);
    const ov = overlay.current;
    return () => {
      window.removeEventListener('keydown', onKey, true);
      stack.splice(stack.indexOf(dialog), 1);
      // React's dev double-mount would otherwise flash a ghost on every open
      if (performance.now() - born > 80) {
        ghostExit(ov, (g) => [
          animate(g, [{ opacity: 1 }, { opacity: 0 }], 220),
          animate(g.querySelector('.modal')!, [{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'scale(.5)' }], 240),
        ]);
      }
      opener?.focus?.({ preventScroll: true });
    };
  }, []);

  return (
    <div ref={overlay} className="overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div ref={ref} className={cx('modal', wide && 'wide')} role="dialog" aria-modal="true" aria-label={title}>
        <div className="modal-head">
          <h3>{title}</h3>
          <button className="x-btn" onClick={onClose} aria-label="Close">×</button>
        </div>
        {children}
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>
  );
}
