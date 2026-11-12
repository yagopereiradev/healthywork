import { cn } from './cn';

/**
 * A visible keyboard shortcut hint. Shown only where there is a precise
 * pointer (a desktop), and hidden from screen readers: the control that owns
 * the shortcut announces it through aria-keyshortcuts.
 */
export function Kbd({ children, className }: { children: string; className?: string }) {
  return (
    <kbd
      aria-hidden="true"
      className={cn(
        'hidden rounded-md border border-current px-1.5 py-px font-sans text-xs leading-4 font-semibold opacity-80 pointer-fine:inline-block',
        className,
      )}
    >
      {children}
    </kbd>
  );
}
