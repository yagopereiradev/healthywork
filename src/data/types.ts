import type { DayKey } from '@/lib/dates';

/**
 * Records are meant to stay readable for years.
 *
 * - Units live in the field name (`amountMl`, `focusedSec`), never implied.
 * - `at` is a Unix timestamp in milliseconds.
 * - `day` is the local calendar day the record belongs to, frozen when it is
 *   written. History never shifts if the user later changes time zone.
 */
export interface Entry {
  id: string;
  day: DayKey;
  at: number;
}

export const DRINK_TYPES = ['water', 'coffee', 'tea', 'other'] as const;
export type DrinkType = (typeof DRINK_TYPES)[number];

export interface WaterEntry extends Entry {
  amountMl: number;
  drink: DrinkType;
}

/** Ordered by priority: getting up and walking comes first. */
export const BREAK_TYPES = ['walk', 'neck-shoulders', 'eyes', 'wrists', 'back'] as const;
export type BreakType = (typeof BREAK_TYPES)[number];

export const BREAK_ORIGINS = ['reminder', 'manual', 'focus'] as const;
export type BreakOrigin = (typeof BREAK_ORIGINS)[number];

export interface BreakEntry extends Entry {
  /**
   * What the break was, when the app knows: the person followed a suggested
   * exercise and confirmed it. Null for a break logged by hand ("I took a
   * break"), because the app has no idea what they did and must not pretend.
   */
  type: BreakType | null;
  /** Length of the suggested break. 0 for a break logged by hand: its length is unknown too. */
  durationSec: number;
  origin: BreakOrigin;
}

/** One focus block. `at` is when the block started. */
export interface FocusEntry extends Entry {
  plannedSec: number;
  focusedSec: number;
  completed: boolean;
}

export type NewEntry<T extends Entry> = Omit<T, 'id' | 'day'>;
