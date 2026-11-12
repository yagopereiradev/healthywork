import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { DESKTOP_QUERY, useMediaQuery } from '@/lib/useMediaQuery';
import { useToasts, type Toast } from './toastStore';

/**
 * Where toasts appear: at the top on a phone, in the bottom-right corner on a
 * computer. The region is always in the page, so screen readers announce each
 * toast as it arrives. It lives outside #root to stay usable while a sheet has
 * the rest of the page inert.
 */
export function Toaster({ label }: { label: string }) {
  const toasts = useToasts((state) => state.toasts);
  const desktop = useMediaQuery(DESKTOP_QUERY);

  return createPortal(
    <div
      role="region"
      aria-label={label}
      aria-live="polite"
      className="pointer-events-none fixed inset-x-4 top-[max(1.25rem,env(safe-area-inset-top))] z-[60] flex flex-col gap-2 md:inset-x-auto md:top-auto md:right-6 md:bottom-6 md:w-[22rem] md:flex-col-reverse"
    >
      <AnimatePresence initial={false}>
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} fromY={desktop ? 16 : -16} />
        ))}
      </AnimatePresence>
    </div>,
    document.body,
  );
}

function ToastItem({ toast, fromY }: { toast: Toast; fromY: number }) {
  const dismiss = useToasts((state) => state.dismiss);
  // The countdown waits while the pointer or the keyboard focus is on the toast.
  const [held, setHeld] = useState(false);

  useEffect(() => {
    if (held) return;
    const timer = window.setTimeout(() => dismiss(toast.id), toast.durationMs);
    return () => window.clearTimeout(timer);
  }, [held, dismiss, toast.id, toast.durationMs]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: fromY, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96, transition: { duration: 0.15 } }}
      transition={{ type: 'spring', stiffness: 480, damping: 36 }}
      onPointerEnter={() => setHeld(true)}
      onPointerLeave={() => setHeld(false)}
      onFocus={() => setHeld(true)}
      onBlur={() => setHeld(false)}
      className="pointer-events-auto flex min-h-14 items-center justify-between gap-3 rounded-2xl bg-inverse py-1.5 pr-1.5 pl-4 text-inverse-on shadow-float"
    >
      <div className="flex items-center gap-2.5 py-2 text-[15px] font-semibold">
        {toast.kind === 'confirm' ? (
          <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true" className="shrink-0">
            <circle cx="10" cy="10" r="10" fill="var(--hw-inverse-accent)" />
            <path
              d="M5.5 10.5 l3 3 l6 -7"
              fill="none"
              stroke="var(--hw-inverse)"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        ) : null}
        <span>{toast.message}</span>
      </div>
      {toast.action ? (
        <button
          type="button"
          onClick={() => {
            toast.action?.run();
            dismiss(toast.id);
          }}
          className="min-h-11 shrink-0 rounded-control bg-inverse-raised px-3.5 text-sm font-semibold text-inverse-accent transition-transform duration-150 active:scale-[0.97]"
        >
          {toast.action.label}
        </button>
      ) : null}
    </motion.div>
  );
}
