import { useEffect, type KeyboardEvent, type RefObject } from 'react';

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** Mark the outermost element of every modal layer with this attribute. */
export const MODAL_LAYER = 'data-modal-layer';

/**
 * What makes a surface modal, shared by sheets and full-screen dialogs.
 *
 * While `active`: the rest of the page (and any modal underneath) is inert,
 * focus moves inside and stays there, and when it ends focus returns to
 * whatever had it before. Put `data-autofocus` on the element that should be
 * focused first; otherwise the panel itself is.
 *
 * Returns the keydown handler for the layer: Tab cycles inside the panel and
 * Escape calls `onEscape`.
 */
export function useModal(
  panel: RefObject<HTMLElement | null>,
  active: boolean,
  onEscape: () => void,
): (event: KeyboardEvent) => void {
  useEffect(() => {
    if (!active) return;
    const own = panel.current?.closest(`[${MODAL_LAYER}]`);
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;

    // Everything else on the page that is not already inert: the app itself and
    // any modal layer below this one.
    const behind = [
      document.getElementById('root'),
      ...document.querySelectorAll(`[${MODAL_LAYER}]`),
    ].filter(
      (element): element is HTMLElement =>
        element instanceof HTMLElement && element !== own && !element.hasAttribute('inert'),
    );
    for (const element of behind) element.setAttribute('inert', '');
    document.body.style.overflow = 'hidden';
    (panel.current?.querySelector<HTMLElement>('[data-autofocus]') ?? panel.current)?.focus();

    // This runs as soon as closing starts, not when the exit animation ends, so
    // the page is usable again at once.
    return () => {
      for (const element of behind) element.removeAttribute('inert');
      document.body.style.overflow = previousOverflow;
      opener?.focus();
    };
  }, [active, panel]);

  return (event) => {
    if (event.key === 'Escape') {
      event.stopPropagation();
      onEscape();
      return;
    }
    if (event.key !== 'Tab' || !panel.current) return;

    const focusable = [...panel.current.querySelectorAll<HTMLElement>(FOCUSABLE)];
    const first = focusable[0];
    const last = focusable.at(-1);
    if (!first || !last) {
      event.preventDefault();
      return;
    }
    const current = document.activeElement;
    if (event.shiftKey && (current === first || current === panel.current)) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && current === last) {
      event.preventDefault();
      first.focus();
    }
  };
}
