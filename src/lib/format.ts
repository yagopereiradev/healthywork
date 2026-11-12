/** "1.250" in pt-BR and es, "1,250" in en. */
export function formatNumber(value: number, locale: string): string {
  return new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(value);
}

/** "15:02" (or "3:02 PM" where that is the local habit). */
export function formatTime(timestamp: number, locale: string): string {
  return new Intl.DateTimeFormat(locale, { hour: 'numeric', minute: '2-digit' }).format(
    new Date(timestamp),
  );
}

/** A countdown clock: "0:45", "18:42". Rounds up, so it only shows 0:00 when time is up. */
export function formatClock(totalSeconds: number): string {
  const seconds = Math.max(0, Math.ceil(totalSeconds));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

/** Splits minutes for "2h55" style labels. */
export function splitMinutes(totalMinutes: number): { hours: number; minutes: number } {
  const whole = Math.max(0, Math.round(totalMinutes));
  return { hours: Math.floor(whole / 60), minutes: whole % 60 };
}

/** Litres with one decimal: "12,6" in pt-BR and es, "12.6" in en. */
export function formatLiters(milliliters: number, locale: string): string {
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(milliliters / 1000);
}

/** "12 de novembro", "November 12". */
export function formatDayMonth(date: Date, locale: string): string {
  return new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'long' }).format(date);
}

/** One-letter weekday for chart axes: "S", "T", "Q"… */
export function formatWeekdayInitial(date: Date, locale: string): string {
  return new Intl.DateTimeFormat(locale, { weekday: 'narrow' }).format(date).toLocaleUpperCase();
}

export function formatWeekdayLong(date: Date, locale: string): string {
  return new Intl.DateTimeFormat(locale, { weekday: 'long' }).format(date);
}
