import { LANGUAGES, THEME_PREFERENCES, type Language, type ThemePreference } from '@/data/settings';

/**
 * Theme and language live in IndexedDB with every other setting, but IndexedDB
 * is asynchronous and the first paint cannot wait for it. These two values are
 * mirrored in localStorage so the app starts in the right theme and language.
 * IndexedDB stays the source of truth: the mirror is rewritten from it on load.
 */
const THEME_KEY = 'hw-theme';
const LANGUAGE_KEY = 'hw-lang';

function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string | null): void {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    // Storage can be blocked (private mode, policies). The app still works.
  }
}

export function readBootTheme(): ThemePreference {
  const stored = read(THEME_KEY);
  return (THEME_PREFERENCES as readonly string[]).includes(stored ?? '')
    ? (stored as ThemePreference)
    : 'system';
}

export function readBootLanguage(): Language | null {
  const stored = read(LANGUAGE_KEY);
  return (LANGUAGES as readonly string[]).includes(stored ?? '') ? (stored as Language) : null;
}

export function writeBootPrefs(theme: ThemePreference, language: Language | null): void {
  write(THEME_KEY, theme === 'system' ? null : theme);
  write(LANGUAGE_KEY, language);
}
