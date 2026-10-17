import { useEffect, useRef } from 'react';
import type { ViewId } from '../types';
import { cx } from '../utils';
import Icon from '../ui/Icon';
import type { ChecklistKey } from './content';
import { useChecklist, useOnboarding } from './useOnboarding';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onNavigate: (v: ViewId) => void;
  onStartTour: () => void;
  onDemoWindow: () => void;
}

/** Progress ring drawn as a single stroked circle. */
function Ring({ value, total, size = 22 }: { value: number; total: number; size?: number }) {
  const r = (size - 4) / 2, c = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="ck-ring" aria-hidden="true">
      <circle cx={size / 2} cy={size / 2} r={r} className="bg" />
      <circle cx={size / 2} cy={size / 2} r={r} className="fg" strokeDasharray={c} strokeDashoffset={c * (1 - value / total)} />
    </svg>
  );
}

export default function Checklist({ open, onOpenChange, onNavigate, onStartTour, onDemoWindow }: Props) {
  const { state, update } = useOnboarding();
  const { items, count, total, complete } = useChecklist();
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onOpenChange(false); };
    const onDown = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      if (!panelRef.current?.contains(t) && !t.closest('[data-tour="checklist"]')) onOpenChange(false);
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('mousedown', onDown);
    return () => { window.removeEventListener('keydown', onKey); window.removeEventListener('mousedown', onDown); };
  }, [open, onOpenChange]);

  if (state.checklistDismissed) return null;

  const act = (key: ChecklistKey, view?: ViewId) => {
    onOpenChange(false);
    if (key === 'tour') onStartTour();
    else if (key === 'window') onDemoWindow();
    else if (view) onNavigate(view);
  };
  const next = items.find((i) => !i.done);

  return (
    <>
      <button className={cx('ck-launch', open && 'on', complete && 'complete')} data-tour="checklist"
        onClick={() => onOpenChange(!open)} aria-expanded={open} aria-controls="ck-panel">
        <Ring value={count} total={total} />
        <span className="ck-launch-t">{complete ? 'All set' : 'Get started'}</span>
        <span className="num ck-launch-n">{count}/{total}</span>
      </button>

      {open && (
        <div className="ck-panel" id="ck-panel" ref={panelRef} role="dialog" aria-label="Getting started checklist">
          <div className="ck-head">
            <div>
              <p className="spec"><span className="k">Getting started</span><span className="num">{Math.round((count / total) * 100)}%</span></p>
              <h3>{complete ? 'You’ve done every step.' : next ? `Next: ${next.title.toLowerCase()}` : ''}</h3>
            </div>
            <button className="x-btn" onClick={() => onOpenChange(false)} aria-label="Close checklist">×</button>
          </div>
          <div className="bar ck-bar"><i style={{ width: `${(count / total) * 100}%` }} /></div>

          {complete ? (
            <div className="ck-done">
              <p>You’ve tried every part of BizzNex. To see a step again, open the Help menu (?) in the top bar.</p>
              <button className="btn primary sm" onClick={() => update({ checklistDismissed: true })}>Close the checklist</button>
            </div>
          ) : (
            <ul className="ck-list">
              {items.map((it) => (
                <li key={it.key} className={cx('ck-item', it.done && 'done')}>
                  <span className="ck-box" aria-hidden="true">{it.done && <Icon name="tick" size={11} strokeWidth={2.6} />}</span>
                  <div className="ck-txt">
                    <div className="ck-t">
                      {it.title}
                      {it.recommended && !it.done && <span className="tag soft ck-rec">For you</span>}
                    </div>
                    {!it.done && <div className="ck-b">{it.body}</div>}
                  </div>
                  {!it.done && (
                    <button className="btn ghost sm" onClick={() => act(it.key, it.view)} aria-label={`${it.cta}: ${it.title}`}>
                      {it.cta}
                    </button>
                  )}
                  <span className="sr-only">{it.done ? 'Completed' : 'Not completed'}</span>
                </li>
              ))}
            </ul>
          )}

          {!complete && (
            <div className="ck-foot">
              <button className="btn quiet sm" onClick={() => update({ checklistDismissed: true })}>Hide the checklist</button>
            </div>
          )}
        </div>
      )}
    </>
  );
}
