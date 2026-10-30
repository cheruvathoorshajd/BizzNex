import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { Language } from '../types';
import { logout, sessionEnded } from './authSlice';

export type AuthMode = 'signup' | 'signin';
/** What the person picked; 'system' follows the OS light/dark setting live. */
export type ThemeMode = 'light' | 'dark' | 'system';

/** The OS colour scheme right now. */
export const systemTheme = (): 'light' | 'dark' =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';

interface UIState {
  language: Language;
  /** The theme in effect (always resolved, so consumers can compare against 'dark'). */
  theme: 'light' | 'dark';
  /** Follow the OS colour scheme instead of a fixed theme. */
  followSystem?: boolean;
  /** Past the landing page in this visit (reset on every load, so the landing is the default opening). */
  introSeen: boolean;
  /** Which tab the auth screen opens on. */
  authMode: AuthMode;
  /** Desktop sidebar folded to an icon rail (hovering it pops the full sidebar out). Kept per browser. */
  sidebarCollapsed?: boolean;
}
const initialState: UIState = { language: 'en', theme: systemTheme(), followSystem: true, introSeen: false, authMode: 'signup' };

const slice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    setLanguage: (s, a: PayloadAction<Language>) => { s.language = a.payload; },
    /** 'system' keeps the current theme until App syncs it with the OS (before paint, see Root). */
    setTheme: (s, a: PayloadAction<ThemeMode>) => {
      s.followSystem = a.payload === 'system';
      if (a.payload !== 'system') s.theme = a.payload;
    },
    /** The OS scheme changed (or was first read) while following it. */
    systemThemeChanged: (s, a: PayloadAction<'light' | 'dark'>) => { if (s.followSystem) s.theme = a.payload; },
    setIntroSeen: (s, a: PayloadAction<boolean>) => { s.introSeen = a.payload; },
    setAuthMode: (s, a: PayloadAction<AuthMode>) => { s.authMode = a.payload; },
    setSidebarCollapsed: (s, a: PayloadAction<boolean>) => { s.sidebarCollapsed = a.payload; },
  },
  // someone who signs out is a returning user: go straight to Sign in, not back through the landing page
  extraReducers: (b) => {
    const toSignIn = (s: UIState) => { s.authMode = 'signin'; s.introSeen = true; };
    b.addCase(logout, toSignIn).addCase(sessionEnded, toSignIn);
  },
});

export const { setLanguage, setTheme, systemThemeChanged, setIntroSeen, setAuthMode, setSidebarCollapsed } = slice.actions;
/** The theme choice as the switch shows it. */
export const themeMode = (s: { ui: UIState }): ThemeMode => (s.ui.followSystem ? 'system' : s.ui.theme);
export default slice.reducer;
