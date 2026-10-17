import { useAppDispatch, useAppSelector } from '../store';
import { setLanguage } from '../store/uiSlice';
import type { ReactNode } from 'react';
import type { Language } from '../types';
import { useT } from '../i18n/useT';
import Icon from '../ui/Icon';
import { useThemeSwitch } from '../ui/useThemeSwitch';

interface Props {
  title: string;
  query: string;
  onQuery: (q: string) => void;
  onMenu: () => void;
  showSearch?: boolean;
  onOpenWindow?: () => void;
  help?: ReactNode;
}

const LANGS: Language[] = ['en', 'es', 'fr'];

export default function Topbar({ title, query, onQuery, onMenu, showSearch, onOpenWindow, help }: Props) {
  const t = useT();
  const dispatch = useAppDispatch();
  const switchTheme = useThemeSwitch();
  const language = useAppSelector((s) => s.ui.language);
  const theme = useAppSelector((s) => s.ui.theme);

  return (
    <header className="topbar">
      <div className="row gap-3">
        <button className="icon-btn menu-btn" onClick={onMenu} aria-label="Menu"><Icon name="menu" /></button>
        <span className="crumb">BizzNex / <b>{title}</b></span>
      </div>

      <div className="top-actions">
        {showSearch && (
          <label className="top-search" data-tour="top-search">
            <Icon name="search" size={16} style={{ color: 'var(--muted)' }} />
            <input
              className="top-search-inp"
              value={query}
              onChange={(e) => onQuery(e.target.value)}
              placeholder={t('action.search') + '…'}
            />
          </label>
        )}

        {onOpenWindow && (
          <button className="tgl" onClick={onOpenWindow} title={t('action.openWindow')} aria-label={t('action.openWindow')}>
            <Icon name="external" size={15} />
            <span className="tgl-text">{t('action.openWindow')}</span>
          </button>
        )}

        <div className="top-prefs" data-tour="top-prefs">
        <div className="seg lang">
          {LANGS.map((l) => (
            <button key={l} className={l === language ? 'on' : ''} onClick={() => dispatch(setLanguage(l))}>{l}</button>
          ))}
        </div>

        <button className="tgl" onClick={switchTheme} aria-label="Toggle theme">
          <Icon name={theme === 'dark' ? 'sun' : 'moon'} size={15} />
          <span className="tgl-text">{theme === 'dark' ? 'Light' : 'Dark'}</span>
        </button>
        </div>

        {help}
      </div>
    </header>
  );
}
