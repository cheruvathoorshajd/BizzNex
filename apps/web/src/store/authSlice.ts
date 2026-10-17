import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { OnboardingState, UpdateOnboardingInput, User } from '@bizznex/shared';

/** How this session started — decides which onboarding the user gets.
 *  signup → full onboarding · demo → demo onboarding (kept on this device) · signin → none, Help only. */
export type SessionKind = 'signup' | 'signin' | 'demo';

interface AuthState {
  token: string | null;
  user: User | null;
  session: { kind: SessionKind; startedAt: string } | null;
  /** Demo visitors share one account, so their onboarding progress lives here instead of on the server. */
  demoOnboarding: OnboardingState;
}
const initialState: AuthState = { token: null, user: null, session: null, demoOnboarding: {} };

const union = (a: string[] = [], b: string[] = []) => Array.from(new Set([...a, ...b]));

const slice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials: (s, a: PayloadAction<{ token: string; user: User; kind: SessionKind }>) => {
      s.token = a.payload.token;
      s.user = a.payload.user;
      s.session = { kind: a.payload.kind, startedAt: new Date().toISOString() };
      s.demoOnboarding = a.payload.kind === 'demo' ? { wizard: 'pending' } : {};
    },
    /** New token or user details for the same session (e.g. after changing your email). */
    refreshCredentials: (s, a: PayloadAction<{ token: string; user: User }>) => {
      s.token = a.payload.token;
      s.user = a.payload.user;
    },
    updateDemoOnboarding: (s, a: PayloadAction<UpdateOnboardingInput>) => {
      const o = s.demoOnboarding, p = a.payload;
      if (p.wizard !== undefined) o.wizard = p.wizard;
      if (p.tourDone !== undefined) o.tourDone = p.tourDone;
      if (p.checklistDismissed !== undefined) o.checklistDismissed = p.checklistDismissed;
      if (p.profile) o.profile = { ...o.profile, ...p.profile };
      if (p.seen) o.seen = union(o.seen, p.seen);
      if (p.actions) o.actions = union(o.actions, p.actions);
    },
    logout: (s) => {
      s.token = null;
      s.user = null;
      s.session = null;
      s.demoOnboarding = {};
    },
  },
});

export const { setCredentials, refreshCredentials, updateDemoOnboarding, logout } = slice.actions;
export default slice.reducer;
