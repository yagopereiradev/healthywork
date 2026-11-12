import { useCallback, useSyncExternalStore } from 'react';

/** True while the media query matches. Re-renders when that changes. */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const list = window.matchMedia(query);
      list.addEventListener('change', onChange);
      return () => list.removeEventListener('change', onChange);
    },
    [query],
  );
  return useSyncExternalStore(subscribe, () => window.matchMedia(query).matches);
}

/** The `md` breakpoint: from here up, sheets become modals and toasts move to the corner. */
export const DESKTOP_QUERY = '(min-width: 48rem)';
