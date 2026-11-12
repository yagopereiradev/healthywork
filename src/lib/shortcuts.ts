import { useEffect, useRef } from 'react';

/** True when the user is typing, so single-key shortcuts must stay out of the way. */
export function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  if (target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement) return true;
  if (target instanceof HTMLInputElement) {
    // Buttons, checkboxes and the like do not take text.
    return !['button', 'checkbox', 'radio', 'range', 'submit', 'reset', 'file', 'color'].includes(
      target.type,
    );
  }
  return false;
}

/** Whether a keydown should trigger the single-key shortcut `key` (e.g. "w", "?"). */
export function matchesShortcut(event: KeyboardEvent, key: string): boolean {
  if (event.defaultPrevented || event.repeat) return false;
  if (event.ctrlKey || event.metaKey || event.altKey) return false;
  if (isTypingTarget(event.target)) return false;
  // While a sheet or modal is open, the page behind it is out of reach.
  if (document.querySelector('[aria-modal="true"]')) return false;
  return event.key.toLowerCase() === key.toLowerCase();
}

export type ShortcutMap = Record<string, () => void>;

/**
 * Registers single-key shortcuts for as long as the component is mounted.
 * They never fire while typing in a field, with a modifier key held, or while
 * a sheet is open.
 */
export function useShortcuts(shortcuts: ShortcutMap): void {
  const latest = useRef(shortcuts);
  useEffect(() => {
    latest.current = shortcuts;
  });

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      for (const [key, run] of Object.entries(latest.current)) {
        if (matchesShortcut(event, key)) {
          event.preventDefault();
          run();
          return;
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);
}
