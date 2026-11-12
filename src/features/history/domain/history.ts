import type { BreakEntry, FocusEntry, WaterEntry } from '@/data/types';
import { daysEndingOn, type DayKey } from '@/lib/dates';

export const RANGES = [7, 30] as const;
export type RangeDays = (typeof RANGES)[number];

export interface DayStat {
  day: DayKey;
  waterMl: number;
  /** Whether the water goal was reached that day. */
  goalReached: boolean;
  breaks: number;
  focusMin: number;
}

export interface HistorySummary {
  days: DayStat[];
  waterMl: number;
  breaks: number;
  focusMin: number;
  /** True when nothing at all was logged in the period. */
  empty: boolean;
}

/**
 * What was logged on each of the last `rangeDays` days, and the totals.
 * "Goal reached" is judged against the goal as it is now.
 */
export function summarizeHistory(
  today: DayKey,
  rangeDays: number,
  data: {
    water: readonly Pick<WaterEntry, 'day' | 'amountMl'>[];
    breaks: readonly Pick<BreakEntry, 'day'>[];
    focus: readonly Pick<FocusEntry, 'day' | 'focusedSec'>[];
  },
  goalMl: number,
): HistorySummary {
  const byDay = new Map<DayKey, { waterMl: number; breaks: number; focusSec: number }>();
  const at = (day: DayKey) => {
    let stat = byDay.get(day);
    if (!stat) byDay.set(day, (stat = { waterMl: 0, breaks: 0, focusSec: 0 }));
    return stat;
  };
  for (const entry of data.water) at(entry.day).waterMl += entry.amountMl;
  for (const entry of data.breaks) at(entry.day).breaks += 1;
  for (const entry of data.focus) at(entry.day).focusSec += entry.focusedSec;

  const days = daysEndingOn(today, rangeDays).map((day): DayStat => {
    const stat = byDay.get(day);
    const waterMl = stat?.waterMl ?? 0;
    return {
      day,
      waterMl,
      goalReached: goalMl > 0 && waterMl >= goalMl,
      breaks: stat?.breaks ?? 0,
      focusMin: Math.floor((stat?.focusSec ?? 0) / 60),
    };
  });

  const total = (pick: (day: DayStat) => number) => days.reduce((sum, day) => sum + pick(day), 0);
  const waterMl = total((day) => day.waterMl);
  const breaks = total((day) => day.breaks);
  const focusMin = total((day) => day.focusMin);
  return { days, waterMl, breaks, focusMin, empty: waterMl + breaks + focusMin === 0 };
}
