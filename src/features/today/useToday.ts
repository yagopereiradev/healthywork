import { useDataStore, useLive, useSettings } from '@/data/hooks';
import type { Settings } from '@/data/settings';
import type { BreakEntry, FocusEntry, WaterEntry } from '@/data/types';
import type { DayKey } from '@/lib/dates';

export interface TodayData {
  settings: Settings;
  water: WaterEntry[];
  breaks: BreakEntry[];
  focus: FocusEntry[];
}

export type TodayState =
  | { status: 'loading' }
  | { status: 'error'; retry: () => void }
  | { status: 'ready'; data: TodayData };

/** Everything the Today screen shows for one day, kept live. */
export function useToday(day: DayKey): TodayState {
  const store = useDataStore();
  const settings = useSettings();
  const water = useLive(() => store.water.watchDay(day), [store, day]);
  const breaks = useLive(() => store.breaks.watchDay(day), [store, day]);
  const focus = useLive(() => store.focus.watchDay(day), [store, day]);

  const all = [settings, water, breaks, focus];
  if (all.some((part) => part.status === 'error')) {
    return { status: 'error', retry: () => all.forEach((part) => part.retry()) };
  }
  if (
    settings.status !== 'ready' ||
    water.status !== 'ready' ||
    breaks.status !== 'ready' ||
    focus.status !== 'ready'
  ) {
    return { status: 'loading' };
  }
  return {
    status: 'ready',
    data: {
      settings: settings.value,
      water: water.value,
      breaks: breaks.value,
      focus: focus.value,
    },
  };
}
