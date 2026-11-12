import type { ThemePreference } from '@/data/settings';

export type ResolvedTheme = 'light' | 'dark';

const SYSTEM_DARK = '(prefers-color-scheme: dark)';

export function resolveTheme(
  preference: ThemePreference,
  systemPrefersDark: boolean,
): ResolvedTheme {
  if (preference === 'system') return systemPrefersDark ? 'dark' : 'light';
  return preference;
}

/** Applies the theme to <html> and keeps the browser chrome in the page colour. */
export function applyTheme(preference: ThemePreference): void {
  const root = document.documentElement;
  root.dataset.theme = resolveTheme(preference, window.matchMedia(SYSTEM_DARK).matches);

  const background = getComputedStyle(root).getPropertyValue('--hw-bg').trim();
  if (background) {
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', background);
  }
}

/** Calls back when the operating system switches between light and dark. */
export function onSystemThemeChange(listener: () => void): () => void {
  const query = window.matchMedia(SYSTEM_DARK);
  query.addEventListener('change', listener);
  return () => query.removeEventListener('change', listener);
}
