import { describe, expect, it } from 'vitest';
import { addDays, dayKey, dayStart, daysEndingOn, formatLongDate } from './dates';

const at = (y: number, m: number, d: number, h = 0, min = 0) =>
  new Date(y, m - 1, d, h, min).getTime();

describe('dayKey', () => {
  it('uses the local calendar day', () => {
    expect(dayKey(at(2026, 11, 12, 15, 2))).toBe('2026-11-12');
  });

  it('rolls over at local midnight, not before', () => {
    expect(dayKey(at(2026, 11, 12, 23, 59))).toBe('2026-11-12');
    expect(dayKey(at(2026, 11, 13, 0, 0))).toBe('2026-11-13');
  });

  it('pads single-digit months and days', () => {
    expect(dayKey(at(2027, 1, 5, 9))).toBe('2027-01-05');
  });
});

describe('dayStart', () => {
  it('returns local midnight of that day', () => {
    expect(dayStart('2026-11-12').getTime()).toBe(at(2026, 11, 12));
  });

  it('rejects malformed keys', () => {
    expect(() => dayStart('nope')).toThrow();
  });
});

describe('addDays', () => {
  it('moves forward and backward', () => {
    expect(addDays('2026-11-12', 1)).toBe('2026-11-13');
    expect(addDays('2026-11-12', -12)).toBe('2026-10-31');
  });

  it('crosses month and year boundaries', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29');
  });
});

describe('daysEndingOn', () => {
  it('lists the days oldest first, ending on the given day', () => {
    expect(daysEndingOn('2026-11-12', 7)).toEqual([
      '2026-11-06',
      '2026-11-07',
      '2026-11-08',
      '2026-11-09',
      '2026-11-10',
      '2026-11-11',
      '2026-11-12',
    ]);
  });
});

describe('formatLongDate', () => {
  const thursday = at(2026, 11, 12, 10);

  it('formats Portuguese without "-feira"', () => {
    expect(formatLongDate(thursday, 'pt-BR')).toBe('Quinta, 12 de novembro');
  });

  it('keeps Portuguese weekend names intact', () => {
    expect(formatLongDate(at(2026, 11, 14, 10), 'pt-BR')).toBe('Sábado, 14 de novembro');
  });

  it('formats Spanish with a capital first letter', () => {
    expect(formatLongDate(thursday, 'es')).toBe('Jueves, 12 de noviembre');
  });

  it('formats English', () => {
    expect(formatLongDate(thursday, 'en')).toBe('Thursday, November 12');
  });
});
