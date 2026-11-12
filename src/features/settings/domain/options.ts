import type { Settings, Weekday } from '@/data/settings';
import { plannedBreaks } from '@/features/breaks/domain/breaks';
import { workdayMinutes } from '@/features/notifications/domain/workday';

/** The choices offered in Settings and in onboarding. Each has an evidence note in docs/EVIDENCE.md. */
export const WATER_GOALS_ML = [1500, 2000, 2500, 3000] as const;
export const WATER_GOAL_LIMITS = { min: 500, max: 6000 } as const;
export const WATER_INTERVALS_MIN = [30, 45, 60, 90] as const;
/** 30 is the pace from the walking study: it is the one labelled "recommended". */
export const BREAK_PACES_MIN = [30, 45, 50, 60] as const;
export const RECOMMENDED_PACE_MIN = 30;
export const FOCUS_GOALS_MIN = [120, 180, 240, 300, 360] as const;

/** Reads a typed water goal. Null when it is not a sensible number of millilitres. */
export function parseWaterGoal(text: string): number | null {
  const match = /^\s*(\d{3,4})\s*(ml)?\s*$/i.exec(text);
  if (!match?.[1]) return null;
  const goal = Number(match[1]);
  return goal >= WATER_GOAL_LIMITS.min && goal <= WATER_GOAL_LIMITS.max ? goal : null;
}

export type DaysSummary =
  { kind: 'none' } | { kind: 'weekdays' } | { kind: 'everyDay' } | { kind: 'count'; count: number };

/** How to say a set of working days in a few words. */
export function summarizeDays(days: readonly Weekday[]): DaysSummary {
  const unique = [...new Set(days)].sort((a, b) => a - b);
  if (unique.length === 0) return { kind: 'none' };
  if (unique.length === 7) return { kind: 'everyDay' };
  if (unique.join(',') === '1,2,3,4,5') return { kind: 'weekdays' };
  return { kind: 'count', count: unique.length };
}

/**
 * About how many reminders a working day brings with these settings. It is an
 * estimate for the person to decide with, always computed from their real
 * settings, never a fixed number.
 */
export function remindersPerDay(settings: Pick<Settings, 'water' | 'breaks' | 'workday'>): {
  workMinutes: number;
  water: number;
  breaks: number;
} {
  const workMinutes = workdayMinutes(settings.workday);
  return {
    workMinutes,
    water:
      settings.water.reminderEveryMin > 0
        ? Math.floor(workMinutes / settings.water.reminderEveryMin)
        : 0,
    breaks: plannedBreaks(settings.workday, settings.breaks.everyMin),
  };
}

export type InstallPlatform = 'installed' | 'safari-mac' | 'ios' | 'other';

/** Which install instructions fit this browser, when it does not offer a button. */
export function installPlatform(userAgent: string, standalone: boolean): InstallPlatform {
  if (standalone) return 'installed';
  if (/iPhone|iPad|iPod/.test(userAgent)) return 'ios';
  const safari = /Safari\//.test(userAgent) && !/Chrome|Chromium|Edg\/|OPR\//.test(userAgent);
  if (safari && /Macintosh/.test(userAgent)) return 'safari-mac';
  return 'other';
}
