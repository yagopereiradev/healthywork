import { AnimatePresence, motion, useIsPresent } from 'motion/react';
import { useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { DESKTOP_QUERY, useMediaQuery } from '@/lib/useMediaQuery';
import { cn } from './cn';
import { MODAL_LAYER, useModal } from './useModal';

interface SheetProps {
  open: boolean;
  onClose: () => void;
  /** Id of the element inside the sheet that titles it. */
  labelledBy: string;
  children: ReactNode;
}

/**
 * A modal surface: a sheet that slides up from the bottom on a phone, a
 * centred modal on a computer.
 *
 * While open, focus stays inside it, Esc and a tap on the dimmed background
 * close it, the page behind is inert, and on close focus returns to whatever
 * opened it. Put `data-autofocus` on the element that should receive focus
 * first; otherwise the sheet itself takes it.
 */
export function Sheet({ open, onClose, labelledBy, children }: SheetProps) {
  return createPortal(
    <AnimatePresence>
      {open ? (
        <SheetContent onClose={onClose} labelledBy={labelledBy}>
          {children}
        </SheetContent>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}

function SheetContent({ onClose, labelledBy, children }: Omit<SheetProps, 'open'>) {
  const panel = useRef<HTMLDivElement>(null);
  const desktop = useMediaQuery(DESKTOP_QUERY);
  // False from the moment the sheet starts to close, while it animates out.
  const present = useIsPresent();
  const onKeyDown = useModal(panel, present, onClose);

  return (
    // The keydown handler serves the dialog inside; this wrapper is not interactive itself.
    // eslint-disable-next-line jsx-a11y/no-static-element-interactions
    <div
      {...{ [MODAL_LAYER]: '' }}
      className={cn(
        'fixed inset-0 z-50 flex items-end justify-center md:items-center md:p-6',
        !present && 'pointer-events-none',
      )}
      onKeyDown={onKeyDown}
    >
      <motion.div
        aria-hidden="true"
        className="absolute inset-0 bg-scrim"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        onClick={onClose}
      />
      <motion.div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        tabIndex={-1}
        className={cn(
          'relative flex max-h-[92dvh] w-full flex-col gap-4 overflow-y-auto bg-raised outline-none',
          'rounded-t-sheet px-5 pt-3 pb-[max(1.5rem,env(safe-area-inset-bottom))]',
          'md:max-w-md md:rounded-card-lg md:p-6',
        )}
        initial={desktop ? { opacity: 0, scale: 0.96, y: 8 } : { y: '100%' }}
        animate={desktop ? { opacity: 1, scale: 1, y: 0 } : { y: 0 }}
        exit={{
          ...(desktop ? { opacity: 0, scale: 0.98, y: 4 } : { y: '100%' }),
          transition: { duration: 0.2, ease: [0.4, 0, 1, 1] },
        }}
        transition={{ type: 'spring', stiffness: 420, damping: 38 }}
      >
        <span
          aria-hidden="true"
          className="h-[5px] w-10 shrink-0 self-center rounded-full bg-line md:hidden"
        />
        {children}
      </motion.div>
    </div>
  );
}
