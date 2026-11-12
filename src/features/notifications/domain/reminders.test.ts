import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS } from '@/data/settings';
import {
  advance,
  dismiss,
  dueAt,
  endMeeting,
  promptBreakNow,
  reconcile,
  reminderStatus,
  snooze,
  startMeeting,
  upcomingReminders,
  type ReminderContext,
  type ReminderState,
} from './reminders';
import { currentWindow, nextWindowStart } from './workday';

// Thursday, 12 November 2026. Working hours 09:00 to 18:00, Monday to Friday.
// Water every 45 minutes, breaks every 30.
const at = (hour: number, minute = 0, day = 12) => new Date(2026, 10, day, hour, minute).getTime();

function ctx(now: number, overrides: Partial<ReminderContext> = {}): ReminderContext {
  return {
    now,
    settings: DEFAULT_SETTINGS,
    waterTotalMl: 0,
    lastDrinkAt: null,
    lastBreakAt: null,
    nextBreakType: 'walk',
    ...overrides,
  };
}

/** The state of someone who opened the app at this moment. */
const openedAt = (now: number): ReminderState => reconcile(undefined, ctx(now));

describe('working hours', () => {
  const workday = DEFAULT_SETTINGS.workday;

  it('has a window during working hours and none outside them', () => {
    expect(currentWindow(at(10), workday)).toEqual({ start: at(9), end: at(18) });
    expect(currentWindow(at(8, 59), workday)).toBeNull();
    expect(currentWindow(at(18), workday)).toBeNull();
  });

  it('has no window on a day off', () => {
    // 14 November 2026 is a Saturday.
    expect(currentWindow(at(10, 0, 14), workday)).toBeNull();
  });

  it('knows when working hours start again', () => {
    expect(nextWindowStart(at(7), workday)).toBe(at(9));
    expect(nextWindowStart(at(19), workday)).toBe(at(9, 0, 13));
    // Friday evening: back on Monday the 16th.
    expect(nextWindowStart(at(19, 0, 13), workday)).toBe(at(9, 0, 16));
    expect(nextWindowStart(at(10), { ...workday, days: [] })).toBeNull();
  });

  it('follows a night shift across midnight', () => {
    const night = { start: '22:00', end: '06:00', days: [4] as const };
    const shift = { start: at(22), end: at(6, 0, 13) };
    expect(currentWindow(at(23), { ...night, days: [...night.days] })).toEqual(shift);
    expect(currentWindow(at(3, 0, 13), { ...night, days: [...night.days] })).toEqual(shift);
    expect(currentWindow(at(7, 0, 13), { ...night, days: [...night.days] })).toBeNull();
  });
});

describe('when reminders come due', () => {
  it('counts the interval from the moment the app was opened', () => {
    const state = openedAt(at(10));
    expect(dueAt('water', state, ctx(at(10)))).toBe(at(10, 45));
    expect(dueAt('breaks', state, ctx(at(10)))).toBe(at(10, 30));
  });

  it('counts from the start of the working day when opened earlier', () => {
    const state = openedAt(at(8));
    expect(dueAt('breaks', state, ctx(at(9, 5)))).toBe(at(9, 30));
  });

  it('counts from the last drink or break', () => {
    const state = openedAt(at(10));
    expect(dueAt('water', state, ctx(at(10, 30), { lastDrinkAt: at(10, 20) }))).toBe(at(11, 5));
    expect(dueAt('breaks', state, ctx(at(10, 30), { lastBreakAt: at(10, 10) }))).toBe(at(10, 40));
  });

  it('follows the pace set in settings', () => {
    const settings = {
      ...DEFAULT_SETTINGS,
      water: { ...DEFAULT_SETTINGS.water, reminderEveryMin: 90 },
      breaks: { ...DEFAULT_SETTINGS.breaks, everyMin: 60 },
    };
    const state = openedAt(at(10));
    expect(dueAt('water', state, ctx(at(10), { settings }))).toBe(at(11, 30));
    expect(dueAt('breaks', state, ctx(at(10), { settings }))).toBe(at(11));
  });

  it('has nothing due outside working hours or on a day off', () => {
    const state = openedAt(at(7));
    expect(dueAt('water', state, ctx(at(7)))).toBeNull();
    expect(dueAt('breaks', openedAt(at(19)), ctx(at(19)))).toBeNull();
    expect(dueAt('breaks', openedAt(at(10, 0, 14)), ctx(at(10, 0, 14)))).toBeNull();
  });

  it('does not schedule a reminder for after the working day ends', () => {
    const state = openedAt(at(17, 40));
    expect(dueAt('breaks', state, ctx(at(17, 40)))).toBeNull();
    expect(dueAt('water', state, ctx(at(17, 40)))).toBeNull();
  });

  it('stops water reminders once the goal is reached, and only those', () => {
    const state = openedAt(at(10));
    const reached = ctx(at(10), { waterTotalMl: 2000, lastDrinkAt: at(9, 50) });
    expect(dueAt('water', state, reached)).toBeNull();
    expect(dueAt('breaks', state, reached)).toBe(at(10, 30));
  });

  it('moves the next break to the end of a running focus block, earlier or later', () => {
    const state = openedAt(at(10));
    // The interval says 10:30, but the block (and its break) ends at 10:20.
    expect(dueAt('breaks', state, ctx(at(10), { holdBreaksUntil: at(10, 20) }))).toBe(at(10, 20));
  });

  it('leaves the break at the end of a focus block to the focus timer', () => {
    const state = openedAt(at(10));
    // 10:50, block ending right now: the engine itself opens nothing.
    const during = advance(state, ctx(at(10, 50), { holdBreaksUntil: at(10, 50) }));
    expect(during.fired).not.toContain('breaks');
    expect(during.state.prompts.breaks).toBeNull();
    // Water is not held back by focus.
    const water = advance(state, ctx(at(10, 46), { holdBreaksUntil: at(10, 50) }));
    expect(water.fired).toEqual(['water']);
  });

  it('holds breaks while a focus block is running', () => {
    const state = openedAt(at(10));
    expect(dueAt('breaks', state, ctx(at(10), { holdBreaksUntil: at(10, 50) }))).toBe(at(10, 50));
    expect(dueAt('water', state, ctx(at(10), { holdBreaksUntil: at(10, 50) }))).toBe(at(10, 45));
  });
});

describe('advance', () => {
  it('fires nothing before the time', () => {
    const { state, fired } = advance(openedAt(at(10)), ctx(at(10, 29)));
    expect(fired).toEqual([]);
    expect(state.prompts).toEqual({ water: null, breaks: null });
  });

  it('fires the break when it comes due, with the suggested exercise', () => {
    const { state, fired } = advance(openedAt(at(10)), ctx(at(10, 30), { nextBreakType: 'eyes' }));
    expect(fired).toEqual(['breaks']);
    expect(state.prompts.breaks).toEqual({ at: at(10, 30), type: 'eyes' });
  });

  it('fires each reminder once, not on every tick', () => {
    const first = advance(openedAt(at(10)), ctx(at(10, 30)));
    const second = advance(first.state, ctx(at(10, 31)));
    expect(second.fired).toEqual([]);
    expect(second.state.prompts.breaks).toEqual(first.state.prompts.breaks);
  });

  it('shows one at a time: water waits while a break is on screen', () => {
    // Both are overdue at 11:00.
    const withBreak = advance(openedAt(at(10)), ctx(at(11)));
    expect(withBreak.fired).toEqual(['breaks']);
    expect(withBreak.state.prompts.water).toBeNull();

    // The break is done at 11:02; now the water reminder can come.
    const after = advance(withBreak.state, ctx(at(11, 3), { lastBreakAt: at(11, 2) }));
    expect(after.fired).toEqual(['water']);
    expect(after.state.prompts.breaks).toBeNull();
  });

  it('does not fire when the app is opened in the middle of the day', () => {
    // Opened at 14:00 with nothing logged since 09:00: no instant nagging.
    expect(advance(undefined, ctx(at(14))).fired).toEqual([]);
  });
});

describe('answering a reminder', () => {
  const prompted = () => advance(openedAt(at(10)), ctx(at(10, 30))).state;

  it('goes away when the break is logged', () => {
    const state = reconcile(prompted(), ctx(at(10, 33), { lastBreakAt: at(10, 32) }));
    expect(state.prompts.breaks).toBeNull();
    expect(dueAt('breaks', state, ctx(at(10, 33), { lastBreakAt: at(10, 32) }))).toBe(at(11, 2));
  });

  it('comes back 10 minutes after being postponed', () => {
    const state = snooze(prompted(), 'breaks', at(10, 31));
    expect(state.prompts.breaks).toBeNull();
    expect(dueAt('breaks', state, ctx(at(10, 31)))).toBe(at(10, 41));
    expect(advance(state, ctx(at(10, 40))).fired).toEqual([]);
    expect(advance(state, ctx(at(10, 41))).fired).toEqual(['breaks']);
  });

  it('forgets the postponement if the break is taken in the meantime', () => {
    const state = snooze(prompted(), 'breaks', at(10, 31));
    const context = ctx(at(10, 36), { lastBreakAt: at(10, 35) });
    expect(dueAt('breaks', state, context)).toBe(at(11, 5));
  });

  it('starts a new interval when skipped', () => {
    const state = dismiss(prompted(), 'breaks', at(10, 31));
    expect(state.prompts.breaks).toBeNull();
    expect(dueAt('breaks', state, ctx(at(10, 31)))).toBe(at(11, 1));
  });

  it('closes the water reminder when a drink is logged or the goal is reached', () => {
    const waterPrompted = advance(openedAt(at(10)), ctx(at(10, 45), { lastBreakAt: at(10, 40) }));
    expect(waterPrompted.fired).toEqual(['water']);

    const drank = reconcile(waterPrompted.state, ctx(at(10, 47), { lastDrinkAt: at(10, 46) }));
    expect(drank.prompts.water).toBeNull();

    const reached = reconcile(waterPrompted.state, ctx(at(10, 47), { waterTotalMl: 2000 }));
    expect(reached.prompts.water).toBeNull();
  });

  it('opens a break on request, without waiting', () => {
    const state = promptBreakNow(openedAt(at(10)), 'back', at(10, 5));
    expect(state.prompts.breaks).toEqual({ at: at(10, 5), type: 'back' });
  });
});

describe('in a meeting', () => {
  it('silences everything for the chosen time and turns itself back on', () => {
    const meeting = startMeeting(openedAt(at(10)), at(10, 20), 30);
    expect(meeting.meeting).toEqual({ startedAt: at(10, 20), until: at(10, 50) });

    // 10:30 passes in silence.
    expect(advance(meeting, ctx(at(10, 30))).fired).toEqual([]);
    expect(advance(meeting, ctx(at(10, 49))).fired).toEqual([]);

    // At 10:50 the meeting is over and what came due appears.
    const after = advance(meeting, ctx(at(10, 50)));
    expect(after.state.meeting).toBeNull();
    expect(after.fired).toEqual(['breaks']);
  });

  it('closes whatever was on screen when the meeting starts', () => {
    const prompted = advance(openedAt(at(10)), ctx(at(10, 30))).state;
    expect(startMeeting(prompted, at(10, 31), 60).prompts).toEqual({ water: null, breaks: null });
  });

  it('stays silent until the person comes back when there is no end time', () => {
    const meeting = startMeeting(openedAt(at(10)), at(10, 20), null);
    expect(advance(meeting, ctx(at(13))).fired).toEqual([]);
    expect(dueAt('breaks', meeting, ctx(at(13)))).toBeNull();

    const back = endMeeting(meeting);
    expect(advance(back, ctx(at(13, 1))).fired).toEqual(['breaks']);
  });

  it('shows the time each reminder is expected after the meeting', () => {
    const meeting = startMeeting(openedAt(at(10)), at(10, 20), 60);
    expect(upcomingReminders(meeting, ctx(at(10, 25)))).toEqual([
      { kind: 'water', at: at(11, 20) },
      { kind: 'breaks', at: at(11, 20), type: 'walk' },
    ]);
  });
});

describe('a new day', () => {
  it('starts clean after midnight', () => {
    const yesterday = snooze(
      advance(openedAt(at(17)), ctx(at(17, 30))).state,
      'breaks',
      at(17, 31),
    );
    const today = reconcile(yesterday, ctx(at(9, 10, 13)));

    expect(today.day).toBe('2026-11-13');
    expect(today.snoozes).toEqual({ water: null, breaks: null });
    expect(today.prompts).toEqual({ water: null, breaks: null });
    expect(dueAt('breaks', today, ctx(at(9, 10, 13)))).toBe(at(9, 40, 13));
  });

  it('counts water against the new day, so reminders are back after a goal day', () => {
    const state = openedAt(at(9, 0, 13));
    expect(dueAt('water', state, ctx(at(9, 0, 13), { waterTotalMl: 0 }))).toBe(at(9, 45, 13));
  });

  it('keeps an open-ended meeting across midnight, and drops a finished one', () => {
    const open = startMeeting(openedAt(at(17)), at(17), null);
    expect(reconcile(open, ctx(at(9, 0, 13))).meeting).toEqual(open.meeting);

    const timed = startMeeting(openedAt(at(17)), at(17), 30);
    expect(reconcile(timed, ctx(at(9, 0, 13))).meeting).toBeNull();
  });
});

describe('what the app says', () => {
  it('reports the status for the header', () => {
    const state = openedAt(at(10));
    expect(reminderStatus(state, ctx(at(10)))).toEqual({ kind: 'active', until: at(18) });
    expect(reminderStatus(openedAt(at(19)), ctx(at(19)))).toEqual({
      kind: 'off',
      resumesAt: at(9, 0, 13),
    });
    expect(reminderStatus(startMeeting(state, at(10), 30), ctx(at(10, 5)))).toEqual({
      kind: 'meeting',
      until: at(10, 30),
    });
  });

  it('lists what is still to come today, soonest first', () => {
    expect(
      upcomingReminders(openedAt(at(10)), ctx(at(10, 5), { nextBreakType: 'wrists' })),
    ).toEqual([
      { kind: 'breaks', at: at(10, 30), type: 'wrists' },
      { kind: 'water', at: at(10, 45) },
    ]);
  });

  it('lists nothing outside working hours or once the day is done', () => {
    expect(upcomingReminders(openedAt(at(19)), ctx(at(19)))).toEqual([]);
    expect(upcomingReminders(openedAt(at(17, 50)), ctx(at(17, 50)))).toEqual([]);
  });
});
