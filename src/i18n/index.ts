import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import type { Language } from '@/data/settings';
import { loadLanguage } from './loadLanguage';

/** Starts i18next with one language loaded. Resolves when its strings are ready. */
export async function initI18n(language: Language): Promise<typeof i18n> {
  await i18n.use(initReactI18next).init({
    resources: { [language]: await loadLanguage(language) },
    lng: language,
    // A test keeps every language complete, so there is nothing to fall back to.
    fallbackLng: false,
    defaultNS: 'common',
    interpolation: { escapeValue: false },
  });

  document.documentElement.lang = language;
  i18n.on('languageChanged', (next) => {
    document.documentElement.lang = next;
  });
  return i18n;
}

/** Switches language, downloading its strings first if they are not here yet. */
export async function setLanguage(language: Language): Promise<void> {
  if (i18n.language === language) return;
  if (!i18n.hasResourceBundle(language, 'common')) {
    const bundle = await loadLanguage(language);
    for (const [namespace, strings] of Object.entries(bundle)) {
      i18n.addResourceBundle(language, namespace, strings);
    }
  }
  await i18n.changeLanguage(language);
}

export { i18n };
