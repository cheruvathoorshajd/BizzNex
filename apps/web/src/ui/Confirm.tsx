import { createContext, useCallback, useContext, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import Modal from './Modal';

export interface ConfirmOptions {
  title: string;
  body?: ReactNode;
  /** Label of the destructive button, e.g. "Delete contact". */
  confirmLabel?: string;
}

type Ask = (o: ConfirmOptions) => Promise<boolean>;
const ConfirmCtx = createContext<Ask>(() => Promise.resolve(true));

/** `if (!(await confirm({ title }))) return;` — a promise-based confirmation for destructive actions. */
export const useConfirm = () => useContext(ConfirmCtx);

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState<ConfirmOptions | null>(null);
  const resolver = useRef<(ok: boolean) => void>();

  const ask = useCallback<Ask>((o) => new Promise<boolean>((resolve) => {
    resolver.current?.(false);
    resolver.current = resolve;
    setOpen(o);
  }), []);

  const settle = useCallback((ok: boolean) => {
    resolver.current?.(ok);
    resolver.current = undefined;
    setOpen(null);
  }, []);

  return (
    <ConfirmCtx.Provider value={ask}>
      {children}
      {open && (
        <Modal
          title={open.title}
          onClose={() => settle(false)}
          footer={<>
            <button className="btn" onClick={() => settle(false)}>Cancel</button>
            <button className="btn danger-solid" data-autofocus onClick={() => settle(true)}>{open.confirmLabel ?? 'Delete'}</button>
          </>}
        >
          <div className="modal-body confirm-body">{open.body ?? 'This can’t be undone.'}</div>
        </Modal>
      )}
    </ConfirmCtx.Provider>
  );
}
