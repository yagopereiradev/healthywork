import { describe, expect, it } from 'vitest';
import { summarizeHistory } from './history';

const today = '2026-11-12';

describe('summarizeHistory', () => {
  const data = {
    water: [
      { day: '2026-11-12', amountMl: 750 },
      { day: '2026-11-11', amountMl: 1500 },
      { day: '2026-11-11', amountMl: 500 },
      { day: '2026-11-06', amountMl: 2500 },
      // Outside the last 7 days.
      { day: '2026-11-05', amountMl: 9999 },
    ],
    breaks: [{ day: '2026-11-12' }, { day: '2026-11-12' }, { day: '2026-11-10' }],
    focus: [
      { day: '2026-11-12', focusedSec: 1500 },
      { day: '2026-11-12', focusedSec: 890 },
      { day: '2026-11-09', focusedSec: 3000 },
    ],
  };

  it('lists every day of the period, oldest first, even the empty ones', () => {
    const { days } = summarizeHistory(today, 7, data, 2000);
    expect(days.map((day) => day.day)).toEqual([
      '2026-11-06',
      '2026-11-07',
      '2026-11-08',
      '2026-11-09',
      '2026-11-10',
      '2026-11-11',
      '2026-11-12',
    ]);
    expect(days[1]).toEqual({
      day: '2026-11-07',
      waterMl: 0,
      goalReached: false,
      breaks: 0,
      focusMin: 0,
    });
  });

  it('adds up each day and marks the ones that reached the goal', () => {
    const { days } = summarizeHistory(today, 7, data, 2000);
    expect(days.at(-1)).toEqual({
      day: today,
      waterMl: 750,
      goalReached: false,
      breaks: 2,
      focusMin: 39,
    });
    expect(days.map((day) => day.goalReached)).toEqual([
      true,
      false,
      false,
      false,
      false,
      true,
      false,
    ]);
  });

  it('totals only what is inside the period', () => {
    const summary = summarizeHistory(today, 7, data, 2000);
    expect(summary.waterMl).toBe(5250);
    expect(summary.breaks).toBe(3);
    expect(summary.focusMin).toBe(89);
    expect(summary.empty).toBe(false);
  });

  it('covers 30 days when asked', () => {
    const summary = summarizeHistory(today, 30, data, 2000);
    expect(summary.days).toHaveLength(30);
    expect(summary.days[0]?.day).toBe('2026-10-14');
    expect(summary.waterMl).toBe(15249);
  });

  it('says when there is nothing to show', () => {
    const summary = summarizeHistory(today, 7, { water: [], breaks: [], focus: [] }, 2000);
    expect(summary.empty).toBe(true);
    expect(summary.days).toHaveLength(7);
  });
});
