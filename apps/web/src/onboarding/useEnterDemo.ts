import { useState } from 'react';
import { useAppDispatch } from '../store';
import { setCredentials } from '../store/authSlice';
import { setIntroSeen } from '../store/uiSlice';
import { useLoginMutation } from '../services/api';

export const DEMO = { email: 'demo@bizznex.app', password: 'password' };

/** One-click entry to the shared demo workspace (starts a demo-onboarding session). */
export function useEnterDemo() {
  const dispatch = useAppDispatch();
  const [login, { isLoading }] = useLoginMutation();
  const [error, setError] = useState('');

  const enter = async () => {
    setError('');
    try {
      const res = await login(DEMO).unwrap();
      dispatch(setIntroSeen(true));
      dispatch(setCredentials({ token: res.token, user: res.user, kind: 'demo' }));
    } catch (err: any) {
      setError(err?.status === 'FETCH_ERROR'
        ? 'We can’t reach the BizzNex server. Check your connection and try again.'
        : 'The demo workspace isn’t available right now. Try again in a moment.');
    }
  };

  return { enter, loading: isLoading, error };
}
