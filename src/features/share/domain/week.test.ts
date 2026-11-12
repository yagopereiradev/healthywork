import { describe, expect, it } from 'vitest';
import type { Weekday } from '@/data/settings';
import { mondayOf, summarizeWeek, summaryDays } from './week';

// 12 November 2026 is a Thursday.
const thursday = '2026-11-12';
const weekdays: Weekday[] = [1, 2, 3, 4, 5];

describe('mondayOf', () => {
  it('finds the Monday of any day of the week', () => {
    expect(mondayOf(thursday)).toBe('2026-11-09');
    expect(mondayOf('2026-11-09')).toBe('2026-11-09');
    expect(mondayOf('2026-11-15')).toBe('2026-11-09'); // Sunday belongs to the week that ends
    expect(mondayOf('2026-11-16')).toBe('2026-11-16');
  });

  it('crosses a month', () => {
    expect(mondayOf('2026-12-02')).toBe('2026-11-30');
  });
});

describe('summaryDays', () => {
  it('lists the working days of this week, Monday first', () => {
    expect(summaryDays(thursday, 0, weekdays)).toEqual([
      '2026-11-09',
      '2026-11-10',
      '2026-11-11',
      '2026-11-12',
      '2026-11-13',
    ]);
  });

  it('goes back a week', () => {
    expect(summaryDays(thursday, 1, weekdays)).toEqual([
      '2026-11-02',
      '2026-11-03',
      '2026-11-04',
      '2026-11-05',
      '2026-11-06',
    ]);
  });

  it('follows whatever days are working days', () => {
    expect(summaryDays(thursday, 0, [0, 2, 6])).toEqual(['2026-11-10', '2026-11-14', '2026-11-15']);
  });

  it('covers the whole week when no day is a working day', () => {
    expect(summaryDays(thursday, 0, [])).toHaveLength(7);
  });
});

describe('summarizeWeek', () => {
  const days = summaryDays(thursday, 0, weekdays);
  const data = {
    water: [
      { day: '2026-11-09', amountMl: 2000 },
      { day: '2026-11-10', amountMl: 1500 },
      { day: '2026-11-10', amountMl: 750 },
      { day: '2026-11-11', amountMl: 1200 },
      { day: '2026-11-12', amountMl: 500 },
      // Saturday and last week: not part of this working week.
      { day: '2026-11-14', amountMl: 3000 },
      { day: '2026-11-06', amountMl: 3000 },
    ],
    breaks: [{ day: '2026-11-09' }, { day: '2026-11-12' }, { day: '2026-11-07' }],
    focus: [
      { day: '2026-11-10', focusedSec: 3000 },
      { day: '2026-11-12', focusedSec: 1500 },
      { day: '2026-11-08', focusedSec: 9999 },
    ],
  };

  it('adds up only the working days of the week', () => {
    const summary = summarizeWeek(thursday, days, data, 2000);
    expect(summary.waterMl).toBe(5950);
    expect(summary.breaks).toBe(2);
    expect(summary.focusMin).toBe(75);
    expect(summary.empty).toBe(false);
  });

  it('tells the days that reached the goal from the ones that did not and the ones still to come', () => {
    const summary = summarizeWeek(thursday, days, data, 2000);
    expect(summary.days.map((day) => day.state)).toEqual([
      'reached',
      'reached',
      'missed',
      'missed',
      'ahead',
    ]);
    expect(summary.reachedDays).toBe(2);
  });

  it('is empty for a week with nothing logged', () => {
    const summary = summarizeWeek(thursday, days, { water: [], breaks: [], focus: [] }, 2000);
    expect(summary.empty).toBe(true);
    expect(summary.reachedDays).toBe(0);
  });
});
