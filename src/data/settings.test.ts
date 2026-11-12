import { describe, expect, it } from 'vitest';
import { applySettingsPatch, DEFAULT_SETTINGS, normalizeSettings } from './settings';

describe('normalizeSettings', () => {
  it('returns the defaults for anything that is not an object', () => {
    expect(normalizeSettings(undefined)).toEqual(DEFAULT_SETTINGS);
    expect(normalizeSettings('nope')).toEqual(DEFAULT_SETTINGS);
    expect(normalizeSettings([])).toEqual(DEFAULT_SETTINGS);
  });

  it('never hands out the defaults object itself', () => {
    const settings = normalizeSettings(undefined);
    settings.workday.days.push(6);
    expect(DEFAULT_SETTINGS.workday.days).toEqual([1, 2, 3, 4, 5]);
  });

  it('fills in settings that an older version did not have', () => {
    const fromOlderVersion = { water: { goalMl: 2500 }, onboardingDone: true };

    const settings = normalizeSettings(fromOlderVersion);

    expect(settings.water).toEqual({ goalMl: 2500, reminderEveryMin: 45 });
    expect(settings.focus).toEqual(DEFAULT_SETTINGS.focus);
    expect(settings.onboardingDone).toBe(true);
  });

  it('replaces invalid values with the default and drops unknown keys', () => {
    const settings = normalizeSettings({
      water: { goalMl: -5, reminderEveryMin: '45', flavour: 'lime' },
      workday: { start: '25:00', end: '18:30', days: [1, 9] },
      appearance: { theme: 'neon', language: 'fr' },
      notifications: { volume: 3 },
      somethingElse: true,
    });

    expect(settings.water).toEqual(DEFAULT_SETTINGS.water);
    expect(settings.workday).toEqual({ start: '09:00', end: '18:30', days: [1, 2, 3, 4, 5] });
    expect(settings.appearance).toEqual(DEFAULT_SETTINGS.appearance);
    expect(settings.notifications.volume).toBe(0.6);
    expect(settings).not.toHaveProperty('somethingElse');
  });

  it('accepts every supported language and theme', () => {
    const settings = normalizeSettings({ appearance: { theme: 'dark', language: 'es' } });
    expect(settings.appearance).toEqual({ theme: 'dark', language: 'es' });
  });
});

describe('applySettingsPatch', () => {
  it('merges section by section', () => {
    const next = applySettingsPatch(DEFAULT_SETTINGS, {
      focus: { focusMin: 50, breakMin: 10 },
      onboardingDone: true,
    });

    expect(next.focus).toEqual({
      focusMin: 50,
      breakMin: 10,
      blocksPerCycle: 4,
      dailyGoalMin: 240,
    });
    expect(next.onboardingDone).toBe(true);
    expect(next.water).toEqual(DEFAULT_SETTINGS.water);
  });

  it('does not let an invalid patch through', () => {
    const next = applySettingsPatch(DEFAULT_SETTINGS, { water: { goalMl: Number.NaN } });
    expect(next.water.goalMl).toBe(2000);
  });
});
