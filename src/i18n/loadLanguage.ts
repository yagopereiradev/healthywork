import type { Language } from '@/data/settings';

/**
 * Each language is its own chunk: the first paint only downloads the one in
 * use. The others are still precached by the service worker, so switching
 * language works offline too.
 */
const LOADERS = {
  'pt-BR': () => import('./locales/pt-BR'),
  es: () => import('./locales/es'),
  en: () => import('./locales/en'),
} satisfies Record<Language, () => Promise<{ default: Record<string, object> }>>;

export async function loadLanguage(language: Language): Promise<Record<string, object>> {
  return (await LOADERS[language]()).default;
}
