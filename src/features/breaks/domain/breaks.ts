import type { Settings } from '@/data/settings';
import { BREAK_TYPES, type BreakType } from '@/data/types';
import { workdayMinutes } from '@/features/notifications/domain/workday';

/**
 * The order in which breaks are suggested. Getting up to walk is the one with
 * the strongest evidence (docs/EVIDENCE.md), so it is every other suggestion;
 * neck and shoulders, eyes, wrists and back take turns in between.
 */
export const BREAK_ROTATION: readonly BreakType[] = [
  'walk',
  'neck-shoulders',
  'walk',
  'eyes',
  'walk',
  'wrists',
  'walk',
  'back',
];

/**
 * The break to suggest next, given how many were already done today and which
 * types the user keeps enabled. With nothing enabled it still suggests a walk:
 * the app never ends up with no suggestion at all.
 */
export function suggestBreakType(doneToday: number, enabled: readonly BreakType[]): BreakType {
  const allowed = BREAK_ROTATION.filter((type) => enabled.includes(type));
  if (allowed.length === 0) return BREAK_TYPES[0];
  return allowed[Math.max(0, doneToday) % allowed.length] ?? BREAK_TYPES[0];
}

/** How many breaks fit in the working day at the chosen pace. */
export function plannedBreaks(
  workday: Pick<Settings['workday'], 'start' | 'end'>,
  everyMin: number,
): number {
  if (everyMin <= 0) return 0;
  return Math.floor(workdayMinutes(workday) / everyMin);
}
