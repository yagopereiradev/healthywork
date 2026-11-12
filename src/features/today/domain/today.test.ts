import { describe, expect, it } from 'vitest';
import type { Weekday } from '@/data/settings';
import type { BreakEntry, FocusEntry, WaterEntry } from '@/data/types';
import { buildTimeline, focusedMinutes } from './timeline';
import { goalStreak, recentDays, totalsByDay } from './week';

const at = (h: number, min = 0) => new Date(2026, 10, 12, h, min).getTime();
const day = '2026-11-12';

describe('buildTimeline', () => {
  const water: WaterEntry[] = [
    { id: 'w1', day, at: at(13, 5), amountMl: 500, drink: 'coffee' },
    { id: 'w2', day, at: at(15, 2), amountMl: 250, drink: 'water' },
  ];
  const breaks: BreakEntry[] = [
    { id: 'b1', day, at: at(14, 40), type: 'neck-shoulders', durationSec: 300, origin: 'reminder' },
  ];
  const focus: FocusEntry[] = [
    { id: 'f1', day, at: at(13, 50), plannedSec: 3000, focusedSec: 3000, completed: true },
  ];

  it('merges the three modules, most recent first', () => {
    expect(buildTimeline(water, breaks, focus).map((item) => item.id)).toEqual([
      'w2',
      'b1',
      'f1',
      'w1',
    ]);
  });

  it('keeps what each line needs to be written', () => {
    const [first, second, third] = buildTimeline(water, breaks, focus);
    expect(first).toMatchObject({ module: 'water', amountMl: 250, drink: 'water' });
    expect(second).toMatchObject({ module: 'breaks', type: 'neck-shoulders' });
    expect(third).toMatchObject({ module: 'focus', minutes: 50 });
  });

  it('never names a break that was logged by hand', () => {
    const byHand: BreakEntry[] = [
      { id: 'b2', day, at: at(16), type: null, durationSec: 0, origin: 'manual' },
      { id: 'b3', day, at: at(15), type: 'walk', durationSec: 300, origin: 'manual' },
    ];
    expect(buildTimeline([], byHand, [])).toEqual([
      { id: 'b2', at: at(16), module: 'breaks', type: null },
      { id: 'b3', at: at(15), module: 'breaks', type: null },
    ]);
  });

  it('is empty on a day with no records', () => {
    expect(buildTimeline([], [], [])).toEqual([]);
  });
});

describe('focusedMinutes', () => {
  it('adds what was actually focused, not what was planned', () => {
    expect(focusedMinutes([{ focusedSec: 3000 }, { focusedSec: 900 }, { focusedSec: 59 }])).toBe(
      65,
    );
  });
});

describe('week', () => {
  const weekdays: Weekday[] = [1, 2, 3, 4, 5];
  // 2026-11-12 is a Thursday.
  const totals = totalsByDay([
    { day: '2026-11-12', amountMl: 750 },
    { day: '2026-11-11', amountMl: 1500 },
    { day: '2026-11-11', amountMl: 500 },
    { day: '2026-11-10', amountMl: 2200 },
    { day: '2026-11-09', amountMl: 2000 },
    // Saturday and Sunday (7th, 8th): nothing recorded.
    { day: '2026-11-06', amountMl: 2100 },
    { day: '2026-11-05', amountMl: 900 },
    { day: '2026-11-04', amountMl: 2500 },
  ]);

  it('adds the drinks of each day', () => {
    expect(totals.get('2026-11-11')).toBe(2000);
    expect(totals.get('2026-11-08')).toBeUndefined();
  });

  it('lists the last seven days, oldest first, marking the ones that reached the goal', () => {
    const days = recentDays(totals, day, 2000);
    expect(days.map((d) => d.day)).toEqual([
      '2026-11-06',
      '2026-11-07',
      '2026-11-08',
      '2026-11-09',
      '2026-11-10',
      '2026-11-11',
      '2026-11-12',
    ]);
    expect(days.map((d) => d.reached)).toEqual([true, false, false, true, true, true, false]);
    expect(days.at(-1)?.totalMl).toBe(750);
  });

  it('counts a streak across the weekend and does not let an unfinished today break it', () => {
    expect(
      goalStreak(totals, { today: day, goalMl: 2000, workdays: weekdays, lookBackDays: 30 }),
    ).toEqual({ count: 4, complete: true });
  });

  it('includes today once the goal is reached', () => {
    const reachedToday = new Map(totals).set(day, 2000);
    expect(
      goalStreak(reachedToday, { today: day, goalMl: 2000, workdays: weekdays, lookBackDays: 30 })
        .count,
    ).toBe(5);
  });

  it('breaks on a working day below the goal', () => {
    expect(
      goalStreak(totals, {
        today: '2026-11-06',
        goalMl: 2000,
        workdays: weekdays,
        lookBackDays: 30,
      }),
    ).toEqual({ count: 1, complete: true });
  });

  it('says when the streak may continue beyond the days it looked at', () => {
    const always = new Map(
      Array.from({ length: 5 }, (_, i) => [`2026-11-${String(12 - i).padStart(2, '0')}`, 2000]),
    );
    expect(
      goalStreak(always, { today: day, goalMl: 2000, workdays: weekdays, lookBackDays: 5 }),
    ).toEqual({ count: 5, complete: false });
  });

  it('is zero without a goal', () => {
    expect(
      goalStreak(totals, { today: day, goalMl: 0, workdays: weekdays, lookBackDays: 30 }),
    ).toEqual({ count: 0, complete: true });
  });
});
