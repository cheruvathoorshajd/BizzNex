import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { useAppDispatch } from '../store';
import { logout } from '../store/authSlice';
import { setAuthMode } from '../store/uiSlice';
import { useClearSampleMutation, useSeedSampleMutation } from '../services/api';
import { useToast } from '../ui/Toast';
import Icon from '../ui/Icon';
import { useOnboarding } from './useOnboarding';

export interface HelpActions {
  onTour: () => void;
  onChecklist: () => void;
  onPageGuide: () => void;
  onFeatureGuide: () => void;
  onBrand: () => void;
  onSetup: () => void;
}

function Item({ icon, title, sub, onClick, disabled }: { icon: string; title: ReactNode; sub: string; onClick: () => void; disabled?: boolean }) {
  return (
    <button role="menuitem" className="help-item" onClick={onClick} disabled={disabled}>
      <Icon name={icon} /><span><b>{title}</b><small>{sub}</small></span>
    </button>
  );
}

/**
 * The "?" menu in the top bar. Press ? anywhere to toggle it. What it offers depends on the session:
 *   everyone   → product tour, about this page, feature guide, brand & logo
 *   new users  → + checklist, run setup again, add/remove sample data
 *   demo       → + checklist, run setup again, create your own account
 *   sign-in    → + add/remove sample data
 */
export default function HelpMenu({ onTour, onChecklist, onPageGuide, onFeatureGuide, onBrand, onSetup }: HelpActions) {
  const toast = useToast();
  const dispatch = useAppDispatch();
  const { state, update, guided, demo } = useOnboarding();
  const [open, setOpen] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const [seed, { isLoading: seeding }] = useSeedSampleMutation();
  const [clear, { isLoading: clearing }] = useClearSampleMutation();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      const typing = el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName);
      if (e.key === '?' && !typing && !document.querySelector('.tour, .ob, .overlay')) { e.preventDefault(); setOpen((o) => !o); }
      else if (e.key === 'Escape') setOpen(false);
    };
    const onDown = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    window.addEventListener('keydown', onKey);
    window.addEventListener('mousedown', onDown);
    return () => { window.removeEventListener('keydown', onKey); window.removeEventListener('mousedown', onDown); };
  }, []);

  useEffect(() => { if (!open) setConfirmClear(false); }, [open]);

  const run = (fn: () => void) => () => { setOpen(false); fn(); };

  const loadSample = async () => {
    try { await seed().unwrap(); toast('Sample data added'); setOpen(false); }
    catch { toast('Couldn’t add sample data'); }
  };
  const clearSample = async () => {
    try { await clear().unwrap(); toast('Sample data removed'); setOpen(false); }
    catch { toast('Couldn’t remove sample data'); }
  };
  const ownAccount = () => { dispatch(logout()); dispatch(setAuthMode('signup')); };

  return (
    <div className="help" ref={ref}>
      <button className="icon-btn help-btn" data-tour="help" onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu" aria-expanded={open} aria-label="Help" title="Help (?)">
        <span aria-hidden="true">?</span>
      </button>

      {open && (
        <div className="help-pop" role="menu">
          <p className="spec help-h"><span className="k">Help</span><span>{demo ? 'Demo' : guided ? 'Getting started' : 'Guides'}</span></p>

          <Item icon="sparkle" title="Product tour" sub="A one-minute walk through BizzNex" onClick={run(onTour)} />
          <Item icon="note" title="About this page" sub="What this page does, with tips" onClick={run(onPageGuide)} />
          <Item icon="grid" title="Feature guide" sub="Every page in BizzNex, with links" onClick={run(onFeatureGuide)} />
          <Item icon="building" title="Brand & logo" sub="The Skyline logo and how it was made" onClick={run(onBrand)} />

          {guided && (
            <>
              <Item icon="check" title="Getting-started checklist" sub="See what you have left to try" onClick={run(() => {
                if (state.checklistDismissed) update({ checklistDismissed: false });
                onChecklist();
              })} />
              <Item icon="refresh" title="Run setup again" sub={demo ? 'Choose what to explore and your look' : 'Change your business details, goals and look'} onClick={run(onSetup)} />
            </>
          )}

          <div className="rule-soft" style={{ margin: '6px 0' }} />

          {demo ? (
            <Item icon="user" title="Create your own account" sub="Leave the demo and set up your own workspace" onClick={run(ownAccount)} />
          ) : state.sample ? (
            confirmClear ? (
              <div className="help-confirm" role="alert">
                <span>Remove all sample records? Records you created yourself are kept.</span>
                <div className="row gap-2">
                  <button className="btn quiet sm" onClick={() => setConfirmClear(false)}>Cancel</button>
                  <button className="btn danger sm" onClick={clearSample} disabled={clearing}>{clearing ? 'Removing…' : 'Remove'}</button>
                </div>
              </div>
            ) : (
              <Item icon="trash" title="Remove sample data" sub="Keep only the records you created" onClick={() => setConfirmClear(true)} />
            )
          ) : (
            <Item icon="building" title={seeding ? 'Adding sample data…' : 'Add sample data'} sub="Fill the workspace with an example business" onClick={loadSample} disabled={seeding} />
          )}

          <p className="cap help-k"><kbd>?</kbd> opens this menu · <kbd>Esc</kbd> closes it</p>
        </div>
      )}
    </div>
  );
}
