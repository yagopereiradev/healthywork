import type { Settings, Weekday } from '@/data/settings';
import { addDays, dayKey, dayStart, type DayKey } from '@/lib/dates';

type Workday = Settings['workday'];

/** "09:30" to 570. */
export function minutesOfDay(time: string): number {
  const [hours = 0, minutes = 0] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

/**
 * Length of the working day in minutes. An end at or before the start means
 * the shift crosses midnight (22:00 to 06:00 is 8 hours).
 */
export function workdayMinutes(workday: Pick<Workday, 'start' | 'end'>): number {
  const start = minutesOfDay(workday.start);
  const end = minutesOfDay(workday.end);
  return end > start ? end - start : end + 24 * 60 - start;
}

/** One stretch of working time, as timestamps. Reminders only exist inside it. */
export interface WorkWindow {
  start: number;
  end: number;
}

/** A clock time on a given day. Built from calendar parts, so it is right across DST changes. */
function at(day: DayKey, time: string): number {
  const date = dayStart(day);
  const minutes = minutesOfDay(time);
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    Math.floor(minutes / 60),
    minutes % 60,
  ).getTime();
}

/** The working window that starts on `day`, or null if that is a day off. */
function windowStartingOn(day: DayKey, workday: Workday): WorkWindow | null {
  if (!workday.days.includes(dayStart(day).getDay() as Weekday)) return null;
  const overnight = minutesOfDay(workday.end) <= minutesOfDay(workday.start);
  return {
    start: at(day, workday.start),
    end: at(overnight ? addDays(day, 1) : day, workday.end),
  };
}

/** The working window that contains `now`, or null outside working hours. */
export function currentWindow(now: number, workday: Workday): WorkWindow | null {
  const today = dayKey(now);
  // Yesterday's window counts too: a night shift is still running after midnight.
  for (const day of [today, addDays(today, -1)]) {
    const window = windowStartingOn(day, workday);
    if (window && window.start <= now && now < window.end) return window;
  }
  return null;
}

/** When working hours next begin, or null if no day of the week is a working day. */
export function nextWindowStart(now: number, workday: Workday): number | null {
  const today = dayKey(now);
  for (let offset = 0; offset <= 7; offset++) {
    const window = windowStartingOn(addDays(today, offset), workday);
    if (window && window.start > now) return window.start;
  }
  return null;
}
