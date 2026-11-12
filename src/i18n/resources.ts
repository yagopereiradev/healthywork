import type { Language } from '@/data/settings';
import en from './locales/en';
import es from './locales/es';
import ptBR from './locales/pt-BR';

/**
 * Every language at once. Only tests import this, to compare the languages
 * with each other. The app loads one language at a time (see loadLanguage.ts),
 * so this file never reaches the browser.
 */
export const resources = { 'pt-BR': ptBR, es, en } as const satisfies Record<
  Language,
  Record<string, unknown>
>;
