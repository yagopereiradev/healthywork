import { describe, expect, it } from 'vitest';
import { BREAK_TYPES } from '@/data/types';
import { minutesOfDay, workdayMinutes } from '@/features/notifications/domain/workday';
import { plannedBreaks, suggestBreakType } from './breaks';

describe('suggestBreakType', () => {
  it('starts the day with a walk', () => {
    expect(suggestBreakType(0, BREAK_TYPES)).toBe('walk');
  });

  it('makes every other suggestion a walk and rotates the rest in between', () => {
    const sequence = Array.from({ length: 9 }, (_, done) => suggestBreakType(done, BREAK_TYPES));
    expect(sequence).toEqual([
      'walk',
      'neck-shoulders',
      'walk',
      'eyes',
      'walk',
      'wrists',
      'walk',
      'back',
      'walk',
    ]);
  });

  it('only suggests enabled types', () => {
    const enabled = ['eyes', 'back'] as const;
    const sequence = Array.from({ length: 4 }, (_, done) => suggestBreakType(done, enabled));
    expect(sequence).toEqual(['eyes', 'back', 'eyes', 'back']);
  });

  it('still suggests a walk when nothing is enabled', () => {
    expect(suggestBreakType(3, [])).toBe('walk');
  });
});

describe('workday', () => {
  it('converts a time to minutes', () => {
    expect(minutesOfDay('09:30')).toBe(570);
    expect(minutesOfDay('00:00')).toBe(0);
  });

  it('measures a regular day and a shift that crosses midnight', () => {
    expect(workdayMinutes({ start: '09:00', end: '18:00' })).toBe(540);
    expect(workdayMinutes({ start: '22:00', end: '06:00' })).toBe(480);
  });
});

describe('plannedBreaks', () => {
  const nineToSix = { start: '09:00', end: '18:00' };

  it('counts how many breaks fit in the working day at the chosen pace', () => {
    expect(plannedBreaks(nineToSix, 30)).toBe(18);
    expect(plannedBreaks(nineToSix, 50)).toBe(10);
    expect(plannedBreaks(nineToSix, 60)).toBe(9);
  });

  it('is zero for a nonsensical pace', () => {
    expect(plannedBreaks(nineToSix, 0)).toBe(0);
  });
});
