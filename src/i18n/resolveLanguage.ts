import type { Language } from '@/data/settings';

export const FALLBACK_LANGUAGE: Language = 'en';

/**
 * Picks the app language from the browser's ordered preferences
 * (navigator.languages). Any Portuguese maps to pt-BR and any Spanish to es,
 * the only variants the app ships.
 */
export function resolveLanguage(preferred: readonly string[]): Language {
  for (const tag of preferred) {
    const primary = tag.toLowerCase().split('-')[0];
    if (primary === 'pt') return 'pt-BR';
    if (primary === 'es') return 'es';
    if (primary === 'en') return 'en';
  }
  return FALLBACK_LANGUAGE;
}
