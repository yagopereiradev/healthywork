import { useId, type ReactNode } from 'react';
import { Button } from './Button';
import { Sheet } from './Sheet';

interface ConfirmSheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  body: string;
  /** Anything else worth knowing before deciding. */
  children?: ReactNode;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
}

/**
 * Asks before something that cannot be undone. Focus starts on Cancel, so a
 * stray Enter never erases anything, and the confirm button is in the warm
 * colour that marks the irreversible choice.
 */
export function ConfirmSheet({
  open,
  onClose,
  title,
  body,
  children,
  confirmLabel,
  cancelLabel,
  onConfirm,
}: ConfirmSheetProps) {
  const titleId = useId();
  return (
    <Sheet open={open} onClose={onClose} labelledBy={titleId}>
      <header className="flex flex-col gap-1">
        <h2 id={titleId} className="text-[22px]">
          {title}
        </h2>
        <p className="text-[15px] leading-[1.45] text-ink-2">{body}</p>
      </header>
      {children}
      <div className="grid grid-cols-2 gap-2">
        <Button variant="outline" size="xl" onClick={onClose} data-autofocus>
          {cancelLabel}
        </Button>
        <Button
          tone="move"
          size="xl"
          onClick={() => {
            onConfirm();
            onClose();
          }}
        >
          {confirmLabel}
        </Button>
      </div>
    </Sheet>
  );
}
