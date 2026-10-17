import type { MouseEvent } from 'react';
import { useAppDispatch, useAppSelector } from '../store';
import { setTheme } from '../store/uiSlice';
import { themeReveal } from './motion';

/** Toggle light/dark with the new theme spreading from the switch that was pressed. */
export function useThemeSwitch() {
  const dispatch = useAppDispatch();
  const theme = useAppSelector((s) => s.ui.theme);
  return (e?: MouseEvent<HTMLElement>) => {
    const next = theme === 'dark' ? 'light' : 'dark';
    themeReveal(e?.currentTarget ?? null, () => {
      // set the attribute now, not in App's effect, so the new snapshot already has the new colours
      document.documentElement.setAttribute('data-theme', next);
      dispatch(setTheme(next));
    });
  };
}
