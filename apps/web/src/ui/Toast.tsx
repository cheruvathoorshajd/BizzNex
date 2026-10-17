import { createContext, useCallback, useContext, useState } from 'react';
import type { ReactNode } from 'react';
import { cx } from '../utils';
import { dur, reducedMotion } from './motion';

interface ToastItem { id: number; msg: string; leaving?: boolean; }

const ToastCtx = createContext<(msg: string) => void>(() => {});
export const useToast = () => useContext(ToastCtx);

const SHOW_MS = 3200;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const push = useCallback((msg: string) => {
    const id = Date.now() + Math.random();
    setItems((x) => [...x, { id, msg }]);
    // slide out first (CSS `.toast.leaving`), then remove
    setTimeout(() => setItems((x) => x.map((i) => (i.id === id ? { ...i, leaving: true } : i))), SHOW_MS);
    setTimeout(() => setItems((x) => x.filter((i) => i.id !== id)), SHOW_MS + (reducedMotion() ? 0 : dur(260)));
  }, []);

  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="toast-wrap" role="status" aria-live="polite">
        {items.map((i) => <div key={i.id} className={cx('toast', i.leaving && 'leaving')}>{i.msg}</div>)}
      </div>
    </ToastCtx.Provider>
  );
}
