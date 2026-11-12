import { useEffect } from 'react';
import { useSettings } from '@/data/hooks';
import { setLanguage } from '@/i18n';
import { resolveLanguage } from '@/i18n/resolveLanguage';
import { writeBootPrefs } from './bootPrefs';
import { applyTheme, onSystemThemeChange } from './theme';

/** Keeps the page's theme and language in step with the saved settings. Renders nothing. */
export function AppearanceSync() {
  const settings = useSettings();
  const theme = settings.value?.appearance.theme;
  const language = settings.value?.appearance.language;

  useEffect(() => {
    if (theme === undefined || language === undefined) return;
    writeBootPrefs(theme, language);
  }, [theme, language]);

  useEffect(() => {
    if (theme === undefined) return;
    applyTheme(theme);
    if (theme !== 'system') return;
    return onSystemThemeChange(() => applyTheme('system'));
  }, [theme]);

  useEffect(() => {
    if (language === undefined) return;
    void setLanguage(language ?? resolveLanguage(navigator.languages));
  }, [language]);

  return null;
}
