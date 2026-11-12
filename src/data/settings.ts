import { BREAK_TYPES, type BreakType } from './types';

export const THEME_PREFERENCES = ['system', 'light', 'dark'] as const;
export type ThemePreference = (typeof THEME_PREFERENCES)[number];

export const LANGUAGES = ['pt-BR', 'es', 'en'] as const;
export type Language = (typeof LANGUAGES)[number];

/** 0 = Sunday … 6 = Saturday, as in Date#getDay. */
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export interface Settings {
  water: {
    /** A suggestion, never a prescription. See docs/EVIDENCE.md. */
    goalMl: number;
    reminderEveryMin: number;
  };
  breaks: {
    everyMin: number;
    durationMin: number;
    types: BreakType[];
  };
  focus: {
    focusMin: number;
    breakMin: number;
    blocksPerCycle: number;
    dailyGoalMin: number;
  };
  workday: {
    /** "HH:mm", 24-hour clock. */
    start: string;
    end: string;
    days: Weekday[];
  };
  notifications: {
    system: boolean;
    sound: boolean;
    /** 0 to 1. */
    volume: number;
  };
  appearance: {
    theme: ThemePreference;
    /** null follows the browser language. */
    language: Language | null;
  };
  onboardingDone: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  water: { goalMl: 2000, reminderEveryMin: 45 },
  breaks: { everyMin: 30, durationMin: 5, types: [...BREAK_TYPES] },
  focus: { focusMin: 25, breakMin: 5, blocksPerCycle: 4, dailyGoalMin: 240 },
  workday: { start: '09:00', end: '18:00', days: [1, 2, 3, 4, 5] },
  notifications: { system: true, sound: true, volume: 0.6 },
  appearance: { theme: 'system', language: null },
  onboardingDone: false,
};

export type SettingsPatch = {
  [K in keyof Settings]?: Settings[K] extends object ? Partial<Settings[K]> : Settings[K];
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isTime = (value: unknown): value is string =>
  typeof value === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(value);

const positive = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value > 0;

/** One validator per setting. A stored value that fails falls back to the default. */
const VALIDATORS: { [S in keyof Settings]: unknown } = {
  water: { goalMl: positive, reminderEveryMin: positive },
  breaks: {
    everyMin: positive,
    durationMin: positive,
    types: (v: unknown) =>
      Array.isArray(v) && v.every((t) => (BREAK_TYPES as readonly unknown[]).includes(t)),
  },
  focus: {
    focusMin: positive,
    breakMin: positive,
    blocksPerCycle: (v: unknown) => positive(v) && Number.isInteger(v),
    dailyGoalMin: positive,
  },
  workday: {
    start: isTime,
    end: isTime,
    days: (v: unknown) =>
      Array.isArray(v) && v.every((d) => Number.isInteger(d) && d >= 0 && d <= 6),
  },
  notifications: {
    system: (v: unknown) => typeof v === 'boolean',
    sound: (v: unknown) => typeof v === 'boolean',
    volume: (v: unknown) => typeof v === 'number' && v >= 0 && v <= 1,
  },
  appearance: {
    theme: (v: unknown) => (THEME_PREFERENCES as readonly unknown[]).includes(v),
    language: (v: unknown) => v === null || (LANGUAGES as readonly unknown[]).includes(v),
  },
  onboardingDone: (v: unknown) => typeof v === 'boolean',
};

type Validator = (value: unknown) => boolean;

/**
 * Turns whatever is in storage (or in an imported file) into complete, valid
 * Settings. Missing or invalid values take the default, unknown keys are
 * dropped. This is what lets new settings appear in later versions without a
 * migration, and old backups keep importing.
 */
export function normalizeSettings(stored: unknown): Settings {
  const source = isRecord(stored) ? stored : {};
  const result: Record<string, unknown> = {};

  for (const [section, defaults] of Object.entries(DEFAULT_SETTINGS)) {
    const validator = VALIDATORS[section as keyof Settings];
    const value = source[section];

    if (typeof validator === 'function') {
      result[section] = (validator as Validator)(value) ? value : defaults;
      continue;
    }

    const fields = validator as Record<string, Validator>;
    const storedSection = isRecord(value) ? value : {};
    const merged: Record<string, unknown> = {};
    for (const [field, fallback] of Object.entries(defaults as Record<string, unknown>)) {
      const candidate = storedSection[field];
      merged[field] = fields[field]?.(candidate) ? candidate : fallback;
    }
    result[section] = merged;
  }

  return structuredClone(result) as unknown as Settings;
}

export function applySettingsPatch(current: Settings, patch: SettingsPatch): Settings {
  const next: Record<string, unknown> = { ...current };
  for (const [key, value] of Object.entries(patch)) {
    const existing = next[key];
    next[key] = isRecord(existing) && isRecord(value) ? { ...existing, ...value } : value;
  }
  return normalizeSettings(next);
}
