import { useEffect, useState } from 'react';

/**
 * True in exactly one open tab or window of the app at a time.
 *
 * With the app open twice, both would otherwise play the sound and show the
 * notification for the same reminder. The Web Locks API hands the role to one
 * of them, and to another when that one closes. Where the API is missing,
 * every tab leads.
 */
export function useLeader(name: string): boolean {
  const [leader, setLeader] = useState(() => !('locks' in navigator));

  useEffect(() => {
    if (!('locks' in navigator)) return;
    let release = () => {};
    let cancelled = false;

    void navigator.locks
      .request(name, () => {
        if (cancelled) return;
        setLeader(true);
        // Holding the lock for as long as this promise is pending.
        return new Promise<void>((resolve) => {
          release = resolve;
        });
      })
      .catch(() => {});

    return () => {
      cancelled = true;
      release();
    };
  }, [name]);

  return leader;
}
