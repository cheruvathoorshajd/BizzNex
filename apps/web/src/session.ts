import { useAppDispatch, useAppSelector } from './store';
import { logout } from './store/authSlice';
import { playTransition } from './ui/transitions';
import { useT } from './i18n/useT';

/** Sign out behind a short Aurora screen ("See you soon"), from the sidebar or Settings. */
export function useSignOut() {
  const dispatch = useAppDispatch();
  const t = useT();
  const name = useAppSelector((s) => s.auth.user?.name);
  const first = name?.trim().split(/\s+/)[0];
  return () => playTransition(
    { kind: 'aurora', t: first ? t('tx.bye', { name: first }) : t('tx.byeAnon'), s: t('tx.byeSub') },
    { swap: () => dispatch(logout()) },
  );
}
