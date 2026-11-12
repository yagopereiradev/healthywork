import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS } from '@/data/settings';
import { installPlatform, parseWaterGoal, remindersPerDay, summarizeDays } from './options';

describe('parseWaterGoal', () => {
  it('reads a goal in millilitres', () => {
    expect(parseWaterGoal('1800')).toBe(1800);
    expect(parseWaterGoal(' 2200 ml ')).toBe(2200);
  });

  it('refuses amounts that are not a sensible daily goal', () => {
    expect(parseWaterGoal('')).toBeNull();
    expect(parseWaterGoal('200')).toBeNull();
    expect(parseWaterGoal('9000')).toBeNull();
    expect(parseWaterGoal('2,5')).toBeNull();
    expect(parseWaterGoal('lots')).toBeNull();
  });
});

describe('summarizeDays', () => {
  it('names the common sets and counts the rest', () => {
    expect(summarizeDays([1, 2, 3, 4, 5])).toEqual({ kind: 'weekdays' });
    expect(summarizeDays([0, 1, 2, 3, 4, 5, 6])).toEqual({ kind: 'everyDay' });
    expect(summarizeDays([])).toEqual({ kind: 'none' });
    expect(summarizeDays([1, 3, 5])).toEqual({ kind: 'count', count: 3 });
    expect(summarizeDays([5, 4, 3, 2, 1, 1])).toEqual({ kind: 'weekdays' });
  });
});

describe('remindersPerDay', () => {
  it('estimates from the real settings', () => {
    // 09:00 to 18:00, water every 45 minutes, breaks every 30.
    expect(remindersPerDay(DEFAULT_SETTINGS)).toEqual({ workMinutes: 540, water: 12, breaks: 18 });
  });

  it('follows a different pace and a shorter day', () => {
    const settings = {
      ...DEFAULT_SETTINGS,
      water: { ...DEFAULT_SETTINGS.water, reminderEveryMin: 60 },
      breaks: { ...DEFAULT_SETTINGS.breaks, everyMin: 50 },
      workday: { ...DEFAULT_SETTINGS.workday, start: '10:00', end: '16:00' },
    };
    expect(remindersPerDay(settings)).toEqual({ workMinutes: 360, water: 6, breaks: 7 });
  });
});

describe('installPlatform', () => {
  const chromeWindows =
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36';
  const safariMac =
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15';
  const chromeMac =
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36';
  const iphone =
    'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';

  it('recognises where the instructions differ', () => {
    expect(installPlatform(safariMac, false)).toBe('safari-mac');
    expect(installPlatform(iphone, false)).toBe('ios');
    expect(installPlatform(chromeMac, false)).toBe('other');
    expect(installPlatform(chromeWindows, false)).toBe('other');
  });

  it('knows when the app is already installed', () => {
    expect(installPlatform(chromeWindows, true)).toBe('installed');
  });
});
