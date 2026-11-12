import type { BreakEntry, BreakType, DrinkType, FocusEntry, WaterEntry } from '@/data/types';

/** One line of "Your day". */
export type TimelineItem =
  | { id: string; at: number; module: 'water'; amountMl: number; drink: DrinkType }
  | { id: string; at: number; module: 'breaks'; type: BreakType | null }
  | { id: string; at: number; module: 'focus'; minutes: number };

/**
 * Everything recorded in a day as one list, most recent first.
 * A break logged by hand never shows a type, whatever is stored: the app only
 * names a break when the person followed a suggested exercise.
 */
export function buildTimeline(
  water: readonly WaterEntry[],
  breaks: readonly BreakEntry[],
  focus: readonly FocusEntry[],
): TimelineItem[] {
  const items: TimelineItem[] = [
    ...water.map((e): TimelineItem => ({
      id: e.id,
      at: e.at,
      module: 'water',
      amountMl: e.amountMl,
      drink: e.drink,
    })),
    ...breaks.map((e): TimelineItem => ({
      id: e.id,
      at: e.at,
      module: 'breaks',
      type: e.origin === 'manual' ? null : e.type,
    })),
    ...focus.map((e): TimelineItem => ({
      id: e.id,
      at: e.at,
      module: 'focus',
      minutes: Math.round(e.focusedSec / 60),
    })),
  ];
  return items.sort((a, b) => b.at - a.at);
}

/** Minutes of focus in a list of blocks, counting what was actually focused. */
export function focusedMinutes(focus: readonly Pick<FocusEntry, 'focusedSec'>[]): number {
  return Math.floor(focus.reduce((sum, entry) => sum + entry.focusedSec, 0) / 60);
}
