import type { Weekday } from '@/data/settings';
import type { EntryRepository } from '@/data/store';
import type { WaterEntry } from '@/data/types';
import { addDays, type DayKey } from '@/lib/dates';
import { goalStreak, totalsByDay } from './domain/week';

const FIRST_LOOK_DAYS = 60;
const MAX_LOOK_DAYS = 3660;

/**
 * How many days in a row the water goal was reached.
 *
 * It reads two months first and only looks further back when the streak fills
 * the whole window, so the common case stays cheap and a streak of years is
 * still counted in full.
 */
export async function loadGoalStreak(
  water: Pick<EntryRepository<WaterEntry>, 'listBetween'>,
  options: { today: DayKey; goalMl: number; workdays: readonly Weekday[] },
): Promise<number> {
  for (let lookBackDays = FIRST_LOOK_DAYS; ; lookBackDays *= 2) {
    const entries = await water.listBetween(
      addDays(options.today, -(lookBackDays - 1)),
      options.today,
    );
    const streak = goalStreak(totalsByDay(entries), { ...options, lookBackDays });
    if (streak.complete || lookBackDays >= MAX_LOOK_DAYS) return streak.count;
  }
}
