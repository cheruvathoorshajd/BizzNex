import type { MouseEvent } from 'react';
import { useAppDispatch, useAppSelector } from '../store';
import { setTheme, systemTheme, systemThemeChanged } from '../store/uiSlice';
import type { ThemeMode } from '../store/uiSlice';
import { themeReveal } from './motion';

/** Switch theme with the new one spreading from the switch that was pressed.
 *  With no `mode` it flips light/dark; 'system' follows the OS setting from then on. */
export function useThemeSwitch() {
  const dispatch = useAppDispatch();
  const theme = useAppSelector((s) => s.ui.theme);
  return (e?: MouseEvent<HTMLElement>, mode?: ThemeMode) => {
    const next = mode ?? (theme === 'dark' ? 'light' : 'dark');
    const resolved = next === 'system' ? systemTheme() : next;
    const apply = () => {
      // set the attribute now, not in App's effect, so the new snapshot already has the new colours
      document.documentElement.setAttribute('data-theme', resolved);
      dispatch(setTheme(next));
      if (next === 'system') dispatch(systemThemeChanged(resolved));
    };
    // nothing visibly changes (e.g. dark → system while the OS is dark): skip the reveal
    if (resolved === theme) apply(); else themeReveal(e?.currentTarget ?? null, apply);
  };
}
