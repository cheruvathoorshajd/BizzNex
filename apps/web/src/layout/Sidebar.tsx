import { useEffect, useRef, useState } from 'react';
import { NAV } from '../nav';
import type { ViewId } from '../types';
import { useAppDispatch, useAppSelector } from '../store';
import { setSidebarCollapsed } from '../store/uiSlice';
import { useSignOut } from '../session';
import { useGetProjectsQuery } from '../services/api';
import { useT } from '../i18n/useT';
import { cx } from '../utils';
import Icon from '../ui/Icon';
import { isToolId } from '../views/tools/registry';
import Logo from '../ui/Logo';

interface Props {
  view: ViewId;
  onNavigate: (v: ViewId) => void;
  onOpenWindow: (v: ViewId) => void;
  openWindowIds: ViewId[];
  open: boolean;
  onClose: () => void;
  onOpenSettings: () => void;
}

const initials = (name?: string) =>
  (name || 'U').trim().split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('') || 'U';

export default function Sidebar({ view, onNavigate, onOpenWindow, openWindowIds, open, onClose, onOpenSettings }: Props) {
  const t = useT();
  const signOut = useSignOut();
  const user = useAppSelector((s) => s.auth.user);
  const { data: projects = [] } = useGetProjectsQuery();
  const openTasks = projects.reduce((n, p) => n + p.tasks.filter((tk) => tk.status !== 'Completed').length, 0);
  const ref = useRef<HTMLElement>(null);
  const close = useRef(onClose);
  useEffect(() => { close.current = onClose; });

  // Desktop: the sidebar can fold to an icon rail. While folded, hovering it (after a short
  // delay, so passing over it doesn't) or tabbing into it pops the full sidebar out over the
  // page without moving it; leaving it or Escape puts it back. "[" folds and unfolds, as in Linear.
  const dispatch = useAppDispatch();
  const collapsed = useAppSelector((s) => !!s.ui.sidebarCollapsed);
  const [peek, setPeek] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  const desktop = () => window.matchMedia('(min-width: 861px)').matches;
  const peekLater = (on: boolean, ms: number) => {
    window.clearTimeout(timer.current);
    if (collapsed) timer.current = window.setTimeout(() => setPeek(on), ms);
  };
  const toggle = () => { window.clearTimeout(timer.current); setPeek(false); dispatch(setSidebarCollapsed(!collapsed)); };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      const typing = el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName);
      if (e.key === '[' && !typing && !e.metaKey && !e.ctrlKey && !e.altKey && window.matchMedia('(min-width: 861px)').matches
        && !document.querySelector('.tour, .ob, .overlay:not(.motion-ghost)')) {
        e.preventDefault(); setPeek(false); dispatch(setSidebarCollapsed(!collapsed));
      } else if (e.key === 'Escape') setPeek(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [collapsed, dispatch]);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  const go = (v: ViewId) => { setPeek(false); onNavigate(v); };

  // mobile drawer: Escape closes it, and focus goes back to the menu button that opened it
  useEffect(() => {
    if (!open) return;
    const aside = ref.current!;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !e.defaultPrevented) close.current(); };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      if (aside.contains(document.activeElement)) document.querySelector<HTMLElement>('.menu-btn')?.focus({ preventScroll: true });
    };
  }, [open]);

  return (
    <aside
      ref={ref} id="app-sidebar" className={cx('sidebar', open && 'open', collapsed && 'collapsed', collapsed && peek && 'peek')}
      onMouseEnter={() => { if (desktop()) peekLater(true, 140); }}
      onMouseLeave={() => peekLater(false, 220)}
      onFocus={() => { if (collapsed && desktop()) { window.clearTimeout(timer.current); setPeek(true); } }}
      onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node | null)) peekLater(false, 0); }}
    >
      <div className="brand">
        <Logo />
        <button type="button" className="side-toggle" onClick={toggle} aria-controls="app-sidebar" aria-expanded={!collapsed}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'} title={`${collapsed ? 'Expand' : 'Collapse'} sidebar ( [ )`}>
          <Icon name="sidebar" size={16} />
        </button>
      </div>

      {/* only the pages scroll; the footer (you, sign out) stays pinned at the bottom */}
      <div className="side-scroll">
        {NAV.map((section) => (
          <div key={section.group} data-tour={`nav-${section.group.split('.')[1]}`}>
            <div className="nav-grp">{t(section.group)}</div>
            {section.items.map((item) => {
              const tool = isToolId(item.id);
              return (
                <button
                  key={item.id}
                  className={cx('nav', view === item.id && 'active')}
                  aria-current={view === item.id ? 'page' : undefined}
                  onClick={() => go(item.id)}
                  onContextMenu={tool ? (e) => { e.preventDefault(); onOpenWindow(item.id); } : undefined}
                  title={tool ? 'Click opens here · right-click opens a window' : undefined}
                >
                  <Icon name={item.icon} />
                  <span className="nav-label">{t(item.labelKey)}</span>
                  {item.id === 'tasks' && openTasks > 0 && <span className="count num">{openTasks}</span>}
                  {tool && openWindowIds.includes(item.id) && <span className="win-dot" aria-hidden="true" />}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      <div className="side-foot">
        <div className="rule-soft" />
        <div className="user">
          <button type="button" className={cx('user-link', view === 'settings' && 'on')} onClick={() => { setPeek(false); onOpenSettings(); }}
            aria-label="Account settings" title="Account settings" aria-current={view === 'settings' ? 'page' : undefined}>
            <span className="av">{initials(user?.name)}</span>
            <span className="user-text" style={{ flex: 1, minWidth: 0 }}>
              <span className="nm" style={{ display: 'block' }}>{user?.name ?? 'You'}</span>
              <span className="em" style={{ display: 'block' }}>{user?.email ?? ''}</span>
            </span>
          </button>
          <button className="icon-btn side-out" style={{ width: 32, height: 32 }} onClick={signOut} title={t('auth.logout')} aria-label={t('auth.logout')}>
            <Icon name="arrow" size={15} />
          </button>
        </div>
      </div>
    </aside>
  );
}
