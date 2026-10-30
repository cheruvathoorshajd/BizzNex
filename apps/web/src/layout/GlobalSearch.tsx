import { useEffect, useId, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { NAV } from '../nav';
import type { ViewId } from '../types';
import { useGetEventsQuery, useGetProjectsQuery } from '../services/api';
import { useT } from '../i18n/useT';
import { isToolId } from '../views/tools/registry';
import type { ToolId } from '../views/tools/registry';
import Icon from '../ui/Icon';
import { cx, fmtDay } from '../utils';

/**
 * The dashboard's search: one box that finds pages and tools, projects, tasks and events.
 * Choosing a page or tool opens it (Shift+Enter, or ↗, opens a tool in a window); choosing a
 * project, task or event opens its page filtered to it. "/" focuses the box.
 */
type Kind = 'page' | 'project' | 'task' | 'event';
interface Hit { kind: Kind; id: string; label: string; meta?: string; icon: string; view: ViewId; query?: string; tool?: boolean }

const GROUPS: { kind: Kind; title: string }[] = [
  { kind: 'page', title: 'Pages & tools' }, { kind: 'project', title: 'Projects' },
  { kind: 'task', title: 'Tasks' }, { kind: 'event', title: 'Events' },
];
const PER_GROUP = 5;

export default function GlobalSearch({ onNavigate, onOpenWindow }: { onNavigate: (v: ViewId, query?: string) => void; onOpenWindow: (id: ToolId) => void }) {
  const t = useT();
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listId = useId();
  const { data: projects = [] } = useGetProjectsQuery();
  const { data: events = [] } = useGetEventsQuery();

  const needle = q.trim().toLowerCase();
  const has = (...fields: (string | null | undefined)[]) => fields.some((f) => f?.toLowerCase().includes(needle));
  const hits: Hit[] = !needle ? [] : [
    ...NAV.flatMap((g) => g.items).filter((i) => has(t(i.labelKey), i.id)).slice(0, PER_GROUP)
      .map((i): Hit => ({ kind: 'page', id: i.id, label: t(i.labelKey), icon: i.icon, view: i.id, tool: isToolId(i.id), meta: isToolId(i.id) ? 'Tool' : 'Page' })),
    ...projects.filter((p) => has(p.name, p.owner)).slice(0, PER_GROUP)
      .map((p): Hit => ({ kind: 'project', id: p.id, label: p.name, icon: 'folder', view: 'projects', query: p.name,
        meta: `${p.tasks.length} ${p.tasks.length === 1 ? 'task' : 'tasks'}` })),
    ...projects.flatMap((p) => p.tasks.map((tk) => ({ tk, p }))).filter(({ tk }) => has(tk.name, tk.description)).slice(0, PER_GROUP)
      .map(({ tk, p }): Hit => ({ kind: 'task', id: tk.id, label: tk.name, icon: 'check', view: 'tasks', query: tk.name, meta: `${p.name} · ${tk.status}` })),
    ...events.filter((e) => has(e.name, e.category, e.location)).slice(0, PER_GROUP)
      .map((e): Hit => ({ kind: 'event', id: e.id, label: e.name, icon: 'calendar', view: 'events', query: e.name,
        meta: [e.startsAt && fmtDay(e.startsAt), e.location].filter(Boolean).join(' · ') })),
  ];
  const showList = open && !!needle;
  const cur = Math.min(active, Math.max(hits.length - 1, 0));

  const choose = (h: Hit, inWindow = false) => {
    setQ(''); setOpen(false); (document.activeElement as HTMLElement | null)?.blur();
    if (inWindow && h.tool) onOpenWindow(h.view as ToolId);
    else onNavigate(h.view, h.query);
  };

  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setOpen(true); setActive((cur + 1) % Math.max(hits.length, 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((cur - 1 + hits.length) % Math.max(hits.length, 1)); }
    else if (e.key === 'Enter' && hits[cur]) { e.preventDefault(); choose(hits[cur], e.shiftKey); }
    else if (e.key === 'Escape') { e.preventDefault(); if (q) setQ(''); else inputRef.current?.blur(); setOpen(false); }
  };

  // "/" jumps to the search from anywhere on the dashboard (not while typing elsewhere)
  useEffect(() => {
    const onSlash = (e: globalThis.KeyboardEvent) => {
      const el = e.target as HTMLElement;
      const typing = el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName);
      if (e.key === '/' && !typing && !e.metaKey && !e.ctrlKey && !document.querySelector('.tour, .ob, .overlay:not(.motion-ghost)')) {
        e.preventDefault(); inputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onSlash);
    return () => window.removeEventListener('keydown', onSlash);
  }, []);

  return (
    <div className="gsearch" onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setOpen(false); }}>
      <label className="top-search" data-tour="top-search">
        <Icon name="search" size={16} style={{ color: 'var(--muted)' }} />
        <input
          ref={inputRef} className="top-search-inp" value={q} placeholder="Search projects, tasks, events, tools…"
          role="combobox" aria-label="Search BizzNex" aria-expanded={showList} aria-controls={listId} aria-autocomplete="list"
          aria-activedescendant={showList && hits[cur] ? `${listId}-${cur}` : undefined}
          onChange={(e) => { setQ(e.target.value); setOpen(true); setActive(0); }}
          onFocus={() => setOpen(true)} onKeyDown={onKey}
        />
        <kbd className="gsearch-kbd" aria-hidden="true">/</kbd>
      </label>

      {showList && (
        <div className="gsearch-pop">
          <ul id={listId} role="listbox" aria-label="Search results">
            {hits.length === 0 && <li className="gsearch-empty" role="presentation">No projects, tasks, events or tools match “{q.trim()}”.</li>}
            {GROUPS.map((g) => {
              const items = hits.filter((h) => h.kind === g.kind);
              if (!items.length) return null;
              return [
                <li key={`${g.kind}-title`} className="gsearch-grp" role="presentation">{g.title}</li>,
                ...items.map((h) => {
                  const i = hits.indexOf(h);
                  return (
                    // keyboard is handled on the combobox input (aria-activedescendant); clicks land here
                    // eslint-disable-next-line jsx-a11y/click-events-have-key-events
                    <li
                      key={h.kind + h.id} id={`${listId}-${i}`} role="option" aria-selected={i === cur}
                      className={cx('gsearch-opt', i === cur && 'on')}
                      onMouseDown={(e) => e.preventDefault()} onMouseEnter={() => setActive(i)} onClick={() => choose(h)}
                    >
                      <Icon name={h.icon} size={15} />
                      <span className="t">{h.label}</span>
                      {h.meta && <span className="m">{h.meta}</span>}
                      {h.tool && (
                        <button type="button" tabIndex={-1} className="gsearch-win" title="Open in a window (Shift+Enter)"
                          aria-label={`Open ${h.label} in a window`} onClick={(e) => { e.stopPropagation(); choose(h, true); }}>
                          <Icon name="external" size={13} />
                        </button>
                      )}
                    </li>
                  );
                }),
              ];
            })}
          </ul>
          <p className="gsearch-foot" aria-hidden="true">↑ ↓ move · Enter open · Shift+Enter opens a tool in a window · Esc close</p>
        </div>
      )}
    </div>
  );
}
