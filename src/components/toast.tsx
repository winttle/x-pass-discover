'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

/**
 * Toasts.
 *
 * Saving, submitting and guardrail warnings used to be reported only by a line
 * of status text that is easy to miss while typing. A toast confirms the action
 * where the eye already is.
 */

export type ToastTone = 'info' | 'success' | 'warn' | 'danger';

type Toast = {
  id: number;
  tone: ToastTone;
  title: string;
  description?: string;
};

type ToastContextValue = {
  push: (toast: Omit<Toast, 'id'>) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

const TONE_STYLES: Record<ToastTone, string> = {
  info: 'border-line-strong bg-surface text-body',
  success: 'border-accent-100 bg-accent-50 text-accent-700',
  warn: 'border-warn-100 bg-warn-50 text-warn-700',
  danger: 'border-danger-100 bg-danger-50 text-danger-700',
};

const TONE_ICONS: Record<ToastTone, string> = {
  info: '•',
  success: '✓',
  warn: '!',
  danger: '✕',
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const push = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev.slice(-3), { ...toast, id }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4200);
  }, []);

  const value = useMemo(() => ({ push }), [push]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        className="pointer-events-none fixed bottom-5 right-5 z-50 flex w-[min(360px,calc(100vw-2.5rem))] flex-col gap-2"
        role="status"
        aria-live="polite"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto flex animate-slide-in items-start gap-2.5 rounded-xl border px-3.5 py-2.5 shadow-float ${TONE_STYLES[toast.tone]}`}
          >
            <span className="mt-px grid size-4 shrink-0 place-items-center rounded-full bg-current/12 text-[10px] font-bold">
              {TONE_ICONS[toast.tone]}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold">{toast.title}</p>
              {toast.description ? (
                <p className="mt-0.5 text-[11px] leading-relaxed opacity-80">
                  {toast.description}
                </p>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

/** Safe to call outside a provider (server-rendered previews) — it no-ops. */
export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  return context ?? { push: () => undefined };
}
