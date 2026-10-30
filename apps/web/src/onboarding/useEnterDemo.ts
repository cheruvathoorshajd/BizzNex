import { useState } from 'react';
import { useAppDispatch } from '../store';
import { setCredentials } from '../store/authSlice';
import { setIntroSeen } from '../store/uiSlice';
import { useLoginMutation } from '../services/api';
import { playTransition } from '../ui/transitions';
import { useT } from '../i18n/useT';
import type { TransitionScreen } from '../ui/transitions';

export const DEMO = { email: 'demo@bizznex.app', password: 'password' };
/** The Skyline screen for entering the shared demo. */
export const demoScreen = (t: (id: string) => string): TransitionScreen => ({ kind: 'skyline', t: t('tx.demo'), s: t('tx.demoSub') });

/** One-click entry to the shared demo workspace (starts a demo-onboarding session). */
export function useEnterDemo() {
  const dispatch = useAppDispatch();
  const t = useT();
  const [login, { isLoading }] = useLoginMutation();
  const [error, setError] = useState('');

  const enter = async () => {
    setError('');
    try {
      const res = await login(DEMO).unwrap();
      await playTransition(demoScreen(t), {
        swap: () => { dispatch(setIntroSeen(true)); dispatch(setCredentials({ token: res.token, user: res.user, kind: 'demo' })); },
      });
    } catch (err: any) {
      setError(err?.status === 'FETCH_ERROR'
        ? 'We can’t reach the BizzNex server. Check your connection and try again.'
        : 'The demo workspace isn’t available right now. Try again in a moment.');
    }
  };

  return { enter, loading: isLoading, error };
}
