import type { Settings } from '@/data/settings';
import type { BreakType } from '@/data/types';
import { dayKey, type DayKey } from '@/lib/dates';
import { currentWindow, nextWindowStart } from './workday';

/**
 * The reminder engine: every rule about when a water or a break reminder
 * appears. Pure functions over a small state, with the time passed in, so each
 * rule has a test.
 *
 * The rules:
 * - Reminders only exist inside working hours, on working days.
 * - A reminder comes one interval after the last drink or break, after the
 *   last time it was dismissed, or after the app was first opened that day.
 * - Water reminders stop for the day once the goal is reached.
 * - Postponing brings the reminder back in 10 minutes. Skipping starts a new
 *   interval.
 * - "In a meeting" silences everything. Whatever came due meanwhile appears
 *   when the meeting ends.
 * - One at a time: while a break is on screen, the water reminder waits.
 * - During a focus block the next break is the block's own, at its end.
 * - A new day starts clean.
 */

export const SNOOZE_MINUTES = 10;
const MINUTE = 60_000;

export type ReminderKind = 'water' | 'breaks';

export interface Snooze {
  /** When the person postponed. */
  at: number;
  /** When the reminder comes back. */
  until: number;
}

export interface Meeting {
  startedAt: number;
  /** null: until the person says they are back. */
  until: number | null;
}

export interface ReminderState {
  /** The day this state belongs to. A different day means starting over. */
  day: DayKey;
  /** Where each interval is counted from. */
  anchors: Record<ReminderKind, number>;
  snoozes: Record<ReminderKind, Snooze | null>;
  /** Reminders that are on screen right now, waiting for an answer. */
  prompts: {
    water: { at: number } | null;
    /** `focusBreakMin` is set when the break closes a focus block, and is its length. */
    breaks: { at: number; type: BreakType; focusBreakMin?: number } | null;
  };
  meeting: Meeting | null;
}

/** What the engine needs to know about the world at one moment. */
export interface ReminderContext {
  now: number;
  settings: Pick<Settings, 'water' | 'breaks' | 'workday'>;
  /** Today's drinks. */
  waterTotalMl: number;
  lastDrinkAt: number | null;
  lastBreakAt: number | null;
  /** The break to suggest if one comes due. */
  nextBreakType: BreakType;
  /**
   * Set while a focus block is running, to the moment it ends. The block's own
   * break is the next movement break, and the focus timer is the one that
   * opens it: until then the engine fires no break of its own.
   */
  holdBreaksUntil?: number | null;
}

function freshState(now: number, meeting: Meeting | null): ReminderState {
  return {
    day: dayKey(now),
    anchors: { water: now, breaks: now },
    snoozes: { water: null, breaks: null },
    prompts: { water: null, breaks: null },
    meeting,
  };
}

const meetingIsOver = (meeting: Meeting, now: number): boolean =>
  meeting.until !== null && meeting.until <= now;

/**
 * Brings a stored state up to date with the present: a new day starts clean,
 * a timed meeting ends on its own, and a reminder that was answered by logging
 * a drink or a break goes away. Returns the same object when nothing changed.
 */
export function reconcile(stored: ReminderState | undefined, ctx: ReminderContext): ReminderState {
  const { now } = ctx;
  if (!stored || stored.day !== dayKey(now)) {
    // A meeting that is still running carries over midnight.
    const meeting = stored?.meeting && !meetingIsOver(stored.meeting, now) ? stored.meeting : null;
    return freshState(now, meeting);
  }

  let state = stored;
  if (state.meeting && meetingIsOver(state.meeting, now)) {
    state = { ...state, meeting: null };
  }

  const water = state.prompts.water;
  const waterAnswered =
    water !== null &&
    ((ctx.lastDrinkAt ?? 0) > water.at || ctx.waterTotalMl >= ctx.settings.water.goalMl);
  const breaks = state.prompts.breaks;
  const breakAnswered = breaks !== null && (ctx.lastBreakAt ?? 0) > breaks.at;

  if (waterAnswered || breakAnswered) {
    state = {
      ...state,
      prompts: {
        water: waterAnswered ? null : water,
        breaks: breakAnswered ? null : breaks,
      },
    };
  }
  return state;
}

/**
 * When the next reminder of this kind comes due, or null if there is none to
 * wait for: outside working hours, already on screen, the water goal reached,
 * an open-ended meeting, or not enough working time left today.
 */
export function dueAt(
  kind: ReminderKind,
  state: ReminderState,
  ctx: ReminderContext,
): number | null {
  const { now, settings } = ctx;
  const window = currentWindow(now, settings.workday);
  if (!window) return null;
  if (state.prompts[kind]) return null;
  if (kind === 'water' && ctx.waterTotalMl >= settings.water.goalMl) return null;

  const lastEntryAt = (kind === 'water' ? ctx.lastDrinkAt : ctx.lastBreakAt) ?? 0;
  const everyMin = kind === 'water' ? settings.water.reminderEveryMin : settings.breaks.everyMin;
  const snooze = state.snoozes[kind];
  // Logging the thing after postponing answers the reminder: the snooze no longer applies.
  const snoozeHolds = snooze !== null && snooze.at >= lastEntryAt;

  let due = snoozeHolds
    ? snooze.until
    : Math.max(state.anchors[kind], lastEntryAt, window.start) + everyMin * MINUTE;

  // With a focus block running, the next break is the one at the end of the block.
  if (kind === 'breaks' && ctx.holdBreaksUntil) due = ctx.holdBreaksUntil;
  if (state.meeting) {
    if (state.meeting.until === null) return null;
    due = Math.max(due, state.meeting.until);
  }
  return due < window.end ? due : null;
}

/**
 * Moves the state forward to `now` and reports which reminders have just come
 * due. The caller shows them (screen, notification, sound) and saves the state.
 */
export function advance(
  stored: ReminderState | undefined,
  ctx: ReminderContext,
): { state: ReminderState; fired: ReminderKind[] } {
  let state = reconcile(stored, ctx);
  const fired: ReminderKind[] = [];
  const isDue = (kind: ReminderKind) => {
    const due = dueAt(kind, state, ctx);
    return due !== null && due <= ctx.now;
  };

  // During a focus block the focus timer opens the break, not the engine.
  if (!ctx.holdBreaksUntil && isDue('breaks')) {
    state = {
      ...state,
      prompts: { ...state.prompts, breaks: { at: ctx.now, type: ctx.nextBreakType } },
      snoozes: { ...state.snoozes, breaks: null },
    };
    fired.push('breaks');
  }
  // One at a time: the water reminder waits while a break is on screen.
  if (!state.prompts.breaks && isDue('water')) {
    state = {
      ...state,
      prompts: { ...state.prompts, water: { at: ctx.now } },
      snoozes: { ...state.snoozes, water: null },
    };
    fired.push('water');
  }
  return { state, fired };
}

/** "Postpone 10 min": the reminder leaves and comes back later. */
export function snooze(
  state: ReminderState,
  kind: ReminderKind,
  now: number,
  minutes = SNOOZE_MINUTES,
): ReminderState {
  return {
    ...state,
    prompts: { ...state.prompts, [kind]: null },
    snoozes: { ...state.snoozes, [kind]: { at: now, until: now + minutes * MINUTE } },
  };
}

/** "Skip" or "Not now": the reminder leaves and a new interval starts. */
export function dismiss(state: ReminderState, kind: ReminderKind, now: number): ReminderState {
  return {
    ...state,
    prompts: { ...state.prompts, [kind]: null },
    snoozes: { ...state.snoozes, [kind]: null },
    anchors: { ...state.anchors, [kind]: now },
  };
}

/**
 * Opens a break without waiting for it to come due: "Do it now", or the end of
 * a focus block (then with the length of that block's break).
 */
export function promptBreakNow(
  state: ReminderState,
  type: BreakType,
  now: number,
  focusBreakMin?: number,
): ReminderState {
  return {
    ...state,
    prompts: {
      ...state.prompts,
      breaks: focusBreakMin === undefined ? { at: now, type } : { at: now, type, focusBreakMin },
    },
    snoozes: { ...state.snoozes, breaks: null },
  };
}

/** Silences everything for `minutes`, or until the person comes back when null. */
export function startMeeting(
  state: ReminderState,
  now: number,
  minutes: number | null,
): ReminderState {
  return {
    ...state,
    // Whatever was on screen closes. It comes back when the meeting ends, if still due.
    prompts: { water: null, breaks: null },
    meeting: { startedAt: now, until: minutes === null ? null : now + minutes * MINUTE },
  };
}

export function endMeeting(state: ReminderState): ReminderState {
  return state.meeting ? { ...state, meeting: null } : state;
}

export type ReminderStatus =
  | { kind: 'meeting'; until: number | null }
  | { kind: 'active'; until: number }
  | { kind: 'off'; resumesAt: number | null };

/** What the app says about reminders right now, in the page header. */
export function reminderStatus(state: ReminderState, ctx: ReminderContext): ReminderStatus {
  if (state.meeting) return { kind: 'meeting', until: state.meeting.until };
  const window = currentWindow(ctx.now, ctx.settings.workday);
  if (window) return { kind: 'active', until: window.end };
  return { kind: 'off', resumesAt: nextWindowStart(ctx.now, ctx.settings.workday) };
}

export type UpcomingReminder =
  { kind: 'water'; at: number } | { kind: 'breaks'; at: number; type: BreakType };

/** The reminders still to come today, soonest first, for the top of "Your day". */
export function upcomingReminders(state: ReminderState, ctx: ReminderContext): UpcomingReminder[] {
  const upcoming: UpcomingReminder[] = [];
  const water = dueAt('water', state, ctx);
  if (water !== null && water > ctx.now) upcoming.push({ kind: 'water', at: water });
  const breaks = dueAt('breaks', state, ctx);
  if (breaks !== null && breaks > ctx.now) {
    upcoming.push({ kind: 'breaks', at: breaks, type: ctx.nextBreakType });
  }
  return upcoming.sort((a, b) => a.at - b.at);
}
