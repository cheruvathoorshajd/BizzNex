import { useAppDispatch, useAppSelector } from './store';
import { logout } from './store/authSlice';
import { playTransition } from './ui/transitions';

/** Sign out behind a short Aurora screen ("See you soon"), from the sidebar or Settings. */
export function useSignOut() {
  const dispatch = useAppDispatch();
  const name = useAppSelector((s) => s.auth.user?.name);
  const first = name?.trim().split(/\s+/)[0];
  return () => playTransition(
    { kind: 'aurora', t: first ? `See you soon, ${first}.` : 'See you soon.', s: 'Signing out of this browser' },
    { swap: () => dispatch(logout()) },
  );
}
