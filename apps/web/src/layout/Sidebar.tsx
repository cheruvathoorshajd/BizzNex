import { NAV } from '../nav';
import type { ViewId } from '../types';
import { useAppDispatch, useAppSelector } from '../store';
import { logout } from '../store/authSlice';
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
  onOpenSettings: () => void;
}

const initials = (name?: string) =>
  (name || 'U').trim().split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('') || 'U';

export default function Sidebar({ view, onNavigate, onOpenWindow, openWindowIds, open, onOpenSettings }: Props) {
  const t = useT();
  const dispatch = useAppDispatch();
  const user = useAppSelector((s) => s.auth.user);
  const { data: projects = [] } = useGetProjectsQuery();
  const openTasks = projects.reduce((n, p) => n + p.tasks.filter((tk) => tk.status !== 'Completed').length, 0);

  return (
    <aside className={cx('sidebar', open && 'open')}>
      <div className="brand"><Logo /></div>

      {NAV.map((section) => (
        <div key={section.group} data-tour={`nav-${section.group.split('.')[1]}`}>
          <div className="nav-grp">{t(section.group)}</div>
          {section.items.map((item) => {
            const tool = isToolId(item.id);
            return (
              <button
                key={item.id}
                className={cx('nav', view === item.id && 'active')}
                onClick={() => onNavigate(item.id)}
                onContextMenu={tool ? (e) => { e.preventDefault(); onOpenWindow(item.id); } : undefined}
                title={tool ? 'Click opens here · right-click opens a window' : undefined}
              >
                <Icon name={item.icon} />
                {t(item.labelKey)}
                {item.id === 'tasks' && openTasks > 0 && <span className="count num">{openTasks}</span>}
                {tool && openWindowIds.includes(item.id) && <span className="win-dot" aria-hidden="true" />}
              </button>
            );
          })}
        </div>
      ))}

      <div className="side-foot">
        <div className="rule-soft" />
        <div className="user">
          <button type="button" className={cx('user-link', view === 'settings' && 'on')} onClick={onOpenSettings}
            aria-label="Account settings" title="Account settings" aria-current={view === 'settings' ? 'page' : undefined}>
            <span className="av">{initials(user?.name)}</span>
            <span style={{ flex: 1, minWidth: 0 }}>
              <span className="nm" style={{ display: 'block' }}>{user?.name ?? 'You'}</span>
              <span className="em" style={{ display: 'block' }}>{user?.email ?? ''}</span>
            </span>
          </button>
          <button className="icon-btn" style={{ width: 32, height: 32 }} onClick={() => dispatch(logout())} title={t('auth.logout')} aria-label={t('auth.logout')}>
            <Icon name="arrow" size={15} />
          </button>
        </div>
      </div>
    </aside>
  );
}
