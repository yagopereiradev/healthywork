import type { Settings } from '@/data/settings';
import type { FocusEntry, NewEntry } from '@/data/types';

/**
 * The focus timer: blocks of focus in cycles, each followed by a break.
 *
 * The state stores when the block started and how long it was paused, never a
 * running counter. The time left is always computed from the clock, so the
 * timer is right after a reload, a sleeping laptop or a throttled background
 * tab. Pure functions, with the time passed in.
 */
const MINUTE = 60_000;

/** A block stopped before this much focus is not worth a line in the history. */
export const MIN_LOGGED_SEC = 60;
/**
 * A block found finished this long after its end was not finished in front of
 * the person (the app was closed, the computer asleep). It is logged, but no
 * break pops up out of nowhere.
 */
export const STALE_AFTER_MS = 10 * MINUTE;

export const CUSTOM_LIMITS = {
  focusMin: { min: 5, max: 120 },
  breakMin: { min: 1, max: 30 },
} as const;

export const PRESETS = [
  { focusMin: 25, breakMin: 5 },
  { focusMin: 50, breakMin: 10 },
] as const;

export interface FocusPlan {
  focusMin: number;
  breakMin: number;
  blocksPerCycle: number;
}

export type FocusState =
  /** A block is on the clock, running or paused. */
  | {
      phase: 'focus';
      plan: FocusPlan;
      /** 1-based position in the cycle. */
      block: number;
      startedAt: number;
      /** Total time spent paused before the current pause. */
      pausedMs: number;
      /** When the current pause began, or null while running. */
      pausedAt: number | null;
    }
  /** The previous block is done; the next one waits for the person to start it. */
  | { phase: 'ready'; plan: FocusPlan; block: number };

export type RunningBlock = Extract<FocusState, { phase: 'focus' }>;

export function planFrom(focus: Settings['focus']): FocusPlan {
  return {
    focusMin: focus.focusMin,
    breakMin: focus.breakMin,
    blocksPerCycle: focus.blocksPerCycle,
  };
}

export function startBlock(plan: FocusPlan, block: number, now: number): RunningBlock {
  return { phase: 'focus', plan, block, startedAt: now, pausedMs: 0, pausedAt: null };
}

export const isPaused = (state: RunningBlock): boolean => state.pausedAt !== null;

export function pause(state: RunningBlock, now: number): RunningBlock {
  return isPaused(state) ? state : { ...state, pausedAt: now };
}

export function resume(state: RunningBlock, now: number): RunningBlock {
  if (state.pausedAt === null) return state;
  return { ...state, pausedMs: state.pausedMs + (now - state.pausedAt), pausedAt: null };
}

const plannedMs = (state: RunningBlock): number => state.plan.focusMin * MINUTE;

/** Time actually spent focusing in this block, never more than the block. */
export function elapsedMs(state: RunningBlock, now: number): number {
  const until = state.pausedAt ?? now;
  return Math.min(Math.max(until - state.startedAt - state.pausedMs, 0), plannedMs(state));
}

export function remainingMs(state: RunningBlock, now: number): number {
  return plannedMs(state) - elapsedMs(state, now);
}

/** 0 to 1: how much of the block is done. */
export function progress(state: RunningBlock, now: number): number {
  return plannedMs(state) > 0 ? elapsedMs(state, now) / plannedMs(state) : 0;
}

/** When the block will end if nothing changes, or null while it is paused. */
export function endsAt(state: RunningBlock, now: number): number | null {
  return isPaused(state) ? null : now + remainingMs(state, now);
}

/** A paused block never completes on its own. */
export function isComplete(state: RunningBlock, now: number): boolean {
  return !isPaused(state) && remainingMs(state, now) <= 0;
}

/** Whether a completed block ended long enough ago that nobody was there to see it. */
export function isStale(state: RunningBlock, now: number): boolean {
  const end = state.startedAt + state.pausedMs + plannedMs(state);
  return now - end > STALE_AFTER_MS;
}

/**
 * The block ran to its end: it goes to the history, and the next block of the
 * cycle waits to be started. After the last block the cycle is over (null).
 */
export function completeBlock(state: RunningBlock): {
  entry: NewEntry<FocusEntry>;
  next: FocusState | null;
} {
  const plannedSec = state.plan.focusMin * 60;
  return {
    entry: { at: state.startedAt, plannedSec, focusedSec: plannedSec, completed: true },
    next:
      state.block >= state.plan.blocksPerCycle
        ? null
        : { phase: 'ready', plan: state.plan, block: state.block + 1 },
  };
}

/**
 * "End": the session stops here. What was focused so far is logged as an
 * unfinished block, unless it was under a minute.
 */
export function stopBlock(state: RunningBlock, now: number): NewEntry<FocusEntry> | null {
  const focusedSec = Math.floor(elapsedMs(state, now) / 1000);
  if (focusedSec < MIN_LOGGED_SEC) return null;
  return {
    at: state.startedAt,
    plannedSec: state.plan.focusMin * 60,
    focusedSec,
    completed: false,
  };
}

/**
 * Movement reminders wait for the end of a running block: the block's own
 * break is the movement break. A paused block holds nothing back.
 */
export function holdBreaksUntil(state: FocusState | null | undefined, now: number): number | null {
  if (state?.phase !== 'focus') return null;
  return endsAt(state, now);
}

export function isValidCustomBlock(focusMin: number, breakMin: number): boolean {
  const { focusMin: f, breakMin: b } = CUSTOM_LIMITS;
  return (
    Number.isInteger(focusMin) &&
    Number.isInteger(breakMin) &&
    focusMin >= f.min &&
    focusMin <= f.max &&
    breakMin >= b.min &&
    breakMin <= b.max
  );
}
