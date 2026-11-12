import type { Weekday } from '@/data/settings';
import type { BreakEntry, FocusEntry, WaterEntry } from '@/data/types';
import { addDays, dayStart, type DayKey } from '@/lib/dates';

export interface WeekDay {
  day: DayKey;
  /**
   * reached: the water goal was met that day.
   * missed: the day has come and the goal was not met.
   * ahead: the day has not come yet.
   */
  state: 'reached' | 'missed' | 'ahead';
}

export interface WeekSummary {
  /** The working days of the week, Monday first. */
  days: WeekDay[];
  waterMl: number;
  breaks: number;
  focusMin: number;
  reachedDays: number;
  /** True when nothing was logged on those days. */
  empty: boolean;
}

/** The Monday of the week that contains `day`. */
export function mondayOf(day: DayKey): DayKey {
  const weekday = dayStart(day).getDay(); // 0 = Sunday
  return addDays(day, weekday === 0 ? -6 : 1 - weekday);
}

/**
 * The days a weekly summary covers: the working days of the week, Monday
 * first. `weeksAgo` is 0 for the current week and 1 for the previous one.
 * With no working days set, the whole week counts.
 */
export function summaryDays(
  today: DayKey,
  weeksAgo: number,
  workdays: readonly Weekday[],
): DayKey[] {
  const monday = addDays(mondayOf(today), -7 * weeksAgo);
  const week = Array.from({ length: 7 }, (_, index) => addDays(monday, index));
  const working = week.filter((day) => workdays.includes(dayStart(day).getDay() as Weekday));
  return working.length > 0 ? working : week;
}

/**
 * The numbers of one working week, for the shareable summary. Only what was
 * logged on the days listed counts, and "goal reached" is judged against the
 * goal as it is now.
 */
export function summarizeWeek(
  today: DayKey,
  days: readonly DayKey[],
  data: {
    water: readonly Pick<WaterEntry, 'day' | 'amountMl'>[];
    breaks: readonly Pick<BreakEntry, 'day'>[];
    focus: readonly Pick<FocusEntry, 'day' | 'focusedSec'>[];
  },
  goalMl: number,
): WeekSummary {
  const inWeek = new Set(days);
  const waterByDay = new Map<DayKey, number>();
  for (const entry of data.water) {
    if (inWeek.has(entry.day)) {
      waterByDay.set(entry.day, (waterByDay.get(entry.day) ?? 0) + entry.amountMl);
    }
  }
  const breaks = data.breaks.filter((entry) => inWeek.has(entry.day)).length;
  const focusSec = data.focus
    .filter((entry) => inWeek.has(entry.day))
    .reduce((sum, entry) => sum + entry.focusedSec, 0);
  const waterMl = [...waterByDay.values()].reduce((sum, amount) => sum + amount, 0);

  const summaryDaysList = days.map((day): WeekDay => {
    if (day > today) return { day, state: 'ahead' };
    const reached = goalMl > 0 && (waterByDay.get(day) ?? 0) >= goalMl;
    return { day, state: reached ? 'reached' : 'missed' };
  });

  return {
    days: summaryDaysList,
    waterMl,
    breaks,
    focusMin: Math.floor(focusSec / 60),
    reachedDays: summaryDaysList.filter((day) => day.state === 'reached').length,
    empty: waterMl === 0 && breaks === 0 && focusSec === 0,
  };
}
