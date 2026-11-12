/** One-tap amounts. Anything else goes through "another amount". */
export const QUICK_AMOUNTS_ML = [250, 500] as const;
export const DEFAULT_AMOUNT_ML = 250;
/** A single record above this is almost certainly a typo. */
export const MAX_ENTRY_ML = 2000;

export function totalMl(entries: readonly { amountMl: number }[]): number {
  return entries.reduce((sum, entry) => sum + entry.amountMl, 0);
}

export function isValidAmount(amountMl: number): boolean {
  return Number.isInteger(amountMl) && amountMl >= 1 && amountMl <= MAX_ENTRY_ML;
}

/** Reads what the user typed ("300", " 300 ml"). Returns null if it is not a valid amount. */
export function parseAmount(text: string): number | null {
  const match = /^\s*(\d{1,5})\s*(ml)?\s*$/i.exec(text);
  if (!match?.[1]) return null;
  const amount = Number(match[1]);
  return isValidAmount(amount) ? amount : null;
}

export interface GoalProgress {
  /** 0 to 1, for the bar and the glass. Never above 1. */
  ratio: number;
  remainingMl: number;
  reached: boolean;
}

export function goalProgress(total: number, goalMl: number): GoalProgress {
  if (goalMl <= 0) return { ratio: 0, remainingMl: 0, reached: false };
  return {
    ratio: Math.min(Math.max(total / goalMl, 0), 1),
    remainingMl: Math.max(goalMl - total, 0),
    reached: total >= goalMl,
  };
}

/** True when this record is the one that takes the day over the goal. */
export function crossesGoal(totalBefore: number, amountMl: number, goalMl: number): boolean {
  return goalMl > 0 && totalBefore < goalMl && totalBefore + amountMl >= goalMl;
}
