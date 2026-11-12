import type { Weekday } from '@/data/settings';
import { addDays, dayStart, daysEndingOn, type DayKey } from '@/lib/dates';

export interface DayTotal {
  day: DayKey;
  totalMl: number;
  reached: boolean;
}

export function totalsByDay(
  entries: readonly { day: DayKey; amountMl: number }[],
): Map<DayKey, number> {
  const totals = new Map<DayKey, number>();
  for (const entry of entries) {
    totals.set(entry.day, (totals.get(entry.day) ?? 0) + entry.amountMl);
  }
  return totals;
}

/** The last `count` days ending today, oldest first, for the "Your week" chart. */
export function recentDays(
  totals: ReadonlyMap<DayKey, number>,
  today: DayKey,
  goalMl: number,
  count = 7,
): DayTotal[] {
  return daysEndingOn(today, count).map((day) => {
    const totalMl = totals.get(day) ?? 0;
    return { day, totalMl, reached: goalMl > 0 && totalMl >= goalMl };
  });
}

export interface Streak {
  /** Days in a row with the goal reached. */
  count: number;
  /**
   * False when the streak ran to the edge of the days that were looked at, so
   * it may be longer: the caller should look further back.
   */
  complete: boolean;
}

/**
 * Days in a row reaching the water goal, counted back from today.
 *
 * - Today does not break the streak while it is still in progress.
 * - Days off (outside the working days) never break it, and count if the goal
 *   was reached anyway.
 */
export function goalStreak(
  totals: ReadonlyMap<DayKey, number>,
  options: { today: DayKey; goalMl: number; workdays: readonly Weekday[]; lookBackDays: number },
): Streak {
  const { today, goalMl, workdays, lookBackDays } = options;
  if (goalMl <= 0) return { count: 0, complete: true };

  let count = 0;
  for (let offset = 0; offset < lookBackDays; offset++) {
    const day = addDays(today, -offset);
    if ((totals.get(day) ?? 0) >= goalMl) {
      count++;
    } else if (day === today || !workdays.includes(dayStart(day).getDay() as Weekday)) {
      continue;
    } else {
      return { count, complete: true };
    }
  }
  return { count, complete: false };
}
