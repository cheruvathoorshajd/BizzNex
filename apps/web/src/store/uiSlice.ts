import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { Language } from '../types';
import { logout } from './authSlice';

export type AuthMode = 'signup' | 'signin';

interface UIState {
  language: Language;
  theme: 'light' | 'dark';
  /** Past the landing page in this visit (reset on every load, so the landing is the default opening). */
  introSeen: boolean;
  /** Which tab the auth screen opens on. */
  authMode: AuthMode;
}
const initialState: UIState = { language: 'en', theme: 'light', introSeen: false, authMode: 'signup' };

const slice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    setLanguage: (s, a: PayloadAction<Language>) => { s.language = a.payload; },
    setTheme: (s, a: PayloadAction<'light' | 'dark'>) => { s.theme = a.payload; },
    toggleTheme: (s) => { s.theme = s.theme === 'dark' ? 'light' : 'dark'; },
    setIntroSeen: (s, a: PayloadAction<boolean>) => { s.introSeen = a.payload; },
    setAuthMode: (s, a: PayloadAction<AuthMode>) => { s.authMode = a.payload; },
  },
  // someone who signs out is a returning user: go straight to Sign in, not back through the landing page
  extraReducers: (b) => { b.addCase(logout, (s) => { s.authMode = 'signin'; s.introSeen = true; }); },
});

export const { setLanguage, setTheme, toggleTheme, setIntroSeen, setAuthMode } = slice.actions;
export default slice.reducer;
