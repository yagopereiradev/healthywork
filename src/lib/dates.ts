/**
 * Day arithmetic in the user's local time zone.
 *
 * A DayKey ("2026-11-12") is how entries are grouped into days. It is always
 * derived from a timestamp in local time, so "today" rolls over at local
 * midnight and never at UTC midnight.
 */
export type DayKey = string;

const pad = (n: number): string => String(n).padStart(2, '0');

export function dayKey(timestamp: number): DayKey {
  const d = new Date(timestamp);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Local midnight at the start of the given day. */
export function dayStart(day: DayKey): Date {
  const [y, m, d] = day.split('-').map(Number);
  if (!y || !m || !d) throw new Error(`Invalid day key: ${day}`);
  return new Date(y, m - 1, d);
}

export function addDays(day: DayKey, amount: number): DayKey {
  const date = dayStart(day);
  // Setting the date (instead of adding 24h) stays correct across DST changes.
  date.setDate(date.getDate() + amount);
  return dayKey(date.getTime());
}

/** The `count` days ending on `last`, oldest first. */
export function daysEndingOn(last: DayKey, count: number): DayKey[] {
  return Array.from({ length: count }, (_, i) => addDays(last, i - (count - 1)));
}

/**
 * A span of days in words: "6 a 12 de novembro", "November 6 – 12".
 * Portuguese says "a" where the standard format puts a dash.
 */
export function formatPeriod(from: DayKey, to: DayKey, locale: string): string {
  const range = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'long' }).formatRange(
    dayStart(from),
    dayStart(to),
  );
  return locale.startsWith('pt') ? range.replace(/\s[–-]\s/, ' a ') : range;
}

const capitalize = (text: string): string => text.charAt(0).toLocaleUpperCase() + text.slice(1);

/**
 * "Quinta, 12 de novembro" / "Jueves, 12 de noviembre" / "Thursday, November 12".
 * Portuguese drops the "-feira" suffix, the way people actually say it.
 */
export function formatLongDate(timestamp: number, locale: string): string {
  const date = new Date(timestamp);
  const weekday = new Intl.DateTimeFormat(locale, { weekday: 'long' })
    .format(date)
    .replace(/-feira$/, '');
  const dayAndMonth = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'long' }).format(
    date,
  );
  return `${capitalize(weekday)}, ${dayAndMonth}`;
}
