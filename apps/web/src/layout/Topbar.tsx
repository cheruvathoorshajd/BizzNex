import { useAppDispatch, useAppSelector } from '../store';
import { setLanguage, themeMode } from '../store/uiSlice';
import type { ThemeMode } from '../store/uiSlice';
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
  menuOpen?: boolean;
  showSearch?: boolean;
  onOpenWindow?: () => void;
  help?: ReactNode;
  /** Replaces the list filter with another search (the dashboard's global search). */
  search?: ReactNode;
}

const LANGS: Language[] = ['en', 'es', 'fr'];
/** The theme switch steps light → dark → system (follow the OS) → light. */
const NEXT_THEME: Record<ThemeMode, ThemeMode> = { light: 'dark', dark: 'system', system: 'light' };
const THEME_UI: Record<ThemeMode, { icon: string; label: string }> = {
  light: { icon: 'sun', label: 'Light' }, dark: { icon: 'moon', label: 'Dark' }, system: { icon: 'monitor', label: 'Auto' },
};

export default function Topbar({ title, query, onQuery, onMenu, menuOpen, showSearch, onOpenWindow, help, search }: Props) {
  const t = useT();
  const dispatch = useAppDispatch();
  const switchTheme = useThemeSwitch();
  const language = useAppSelector((s) => s.ui.language);
  const mode = useAppSelector(themeMode);
  const next = NEXT_THEME[mode];

  return (
    <header className="topbar">
      <div className="row gap-3">
        <button className="icon-btn menu-btn" onClick={onMenu} aria-label="Menu" aria-expanded={!!menuOpen} aria-controls="app-sidebar"><Icon name="menu" /></button>
        <span className="crumb">BizzNex / <b>{title}</b></span>
      </div>

      <div className="top-actions">
        {search}
        {!search && showSearch && (
          <label className="top-search" data-tour="top-search">
            <Icon name="search" size={16} style={{ color: 'var(--muted)' }} />
            <input
              className="top-search-inp"
              value={query}
              onChange={(e) => onQuery(e.target.value)}
              placeholder={t('action.search') + '…'}
              aria-label={t('action.search')}
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
        <div className="seg lang" role="group" aria-label="Language">
          {LANGS.map((l) => (
            <button key={l} type="button" className={l === language ? 'on' : ''} aria-pressed={l === language} onClick={() => dispatch(setLanguage(l))}>{l}</button>
          ))}
        </div>

        <button className="tgl" onClick={(e) => switchTheme(e, next)}
          aria-label={`Theme: ${THEME_UI[mode].label}. Switch to ${THEME_UI[next].label}`} title={`Switch to ${THEME_UI[next].label} theme`}>
          <Icon name={THEME_UI[next].icon} size={15} />
          <span className="tgl-text">{THEME_UI[next].label}</span>
        </button>
        </div>

        {help}
      </div>
    </header>
  );
}
