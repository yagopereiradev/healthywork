import { describe, expect, it } from 'vitest';
import { createBackup, parseBackup } from '@/data/backup';
import { focusedMinutes } from '@/features/today/domain/timeline';
import { goalStreak, totalsByDay } from '@/features/today/domain/week';
import { totalMl } from '@/features/water/domain/water';
import { dayKey } from '@/lib/dates';
import { buildDemoData, detectDemoMode } from './demo';

// Thursday, 12 November 2026, 15:20.
const now = new Date(2026, 10, 12, 15, 20).getTime();
const today = dayKey(now);

function memoryStorage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => void values.set(key, value),
    removeItem: (key: string) => void values.delete(key),
  };
}

describe('detectDemoMode', () => {
  it('is off by default', () => {
    expect(detectDemoMode('', memoryStorage())).toBe(false);
  });

  it('turns on with ?demo=1 and stays on while moving around the app', () => {
    const storage = memoryStorage();
    expect(detectDemoMode('?demo=1', storage)).toBe(true);
    expect(detectDemoMode('', storage)).toBe(true);
  });

  it('turns off with ?demo=0', () => {
    const storage = memoryStorage();
    detectDemoMode('?demo=1', storage);
    expect(detectDemoMode('?demo=0', storage)).toBe(false);
    expect(detectDemoMode('', storage)).toBe(false);
  });
});

describe('buildDemoData', () => {
  const data = buildDemoData(now);
  const onToday = <T extends { day: string }>(entries: T[]) =>
    entries.filter((e) => e.day === today);

  it('shows today the way the design does', () => {
    expect(totalMl(onToday(data.water))).toBe(1250);
    expect(onToday(data.breaks)).toHaveLength(3);
    expect(focusedMinutes(onToday(data.focus))).toBe(175);
  });

  it('has a month of history and a streak going', () => {
    const days = new Set(data.water.map((entry) => entry.day));
    expect(days.size).toBeGreaterThan(20);
    const streak = goalStreak(totalsByDay(data.water), {
      today,
      goalMl: data.settings.water.goalMl,
      workdays: data.settings.workday.days,
      lookBackDays: 30,
    });
    expect(streak.count).toBeGreaterThanOrEqual(5);
  });

  it('is the same every time for the same moment', () => {
    expect(buildDemoData(now)).toEqual(data);
  });

  it('never invents records in the future', () => {
    for (const entry of [...data.water, ...data.breaks, ...data.focus]) {
      expect(entry.at).toBeLessThanOrEqual(now);
    }
  });

  it('skips onboarding and is a valid backup, ready to import', () => {
    expect(data.settings.onboardingDone).toBe(true);
    expect(parseBackup(JSON.parse(JSON.stringify(createBackup(data, now))))).toEqual(data);
  });
});
