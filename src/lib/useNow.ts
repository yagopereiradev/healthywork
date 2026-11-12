import { useEffect, useState } from 'react';
import { systemClock, type Clock } from './clock';

/**
 * The current time for rendering, refreshed every `everyMs` and whenever the
 * tab becomes visible again (timers are throttled in background tabs, so the
 * value is corrected as soon as someone can see it).
 */
export function useNow(everyMs = 30_000, clock: Clock = systemClock): number {
  const [now, setNow] = useState(clock);

  useEffect(() => {
    const tick = () => setNow(clock());
    const interval = window.setInterval(tick, everyMs);
    const onVisible = () => {
      if (document.visibilityState === 'visible') tick();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [everyMs, clock]);

  return now;
}
