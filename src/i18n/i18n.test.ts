import { describe, expect, it } from 'vitest';
import { LANGUAGES } from '@/data/settings';
import { resolveLanguage } from './resolveLanguage';
import { LANGUAGE_NAMES } from './languages';
import { resources } from './resources';

function keysOf(value: unknown, prefix = ''): string[] {
  if (typeof value !== 'object' || value === null) return [prefix];
  return Object.entries(value).flatMap(([key, child]) =>
    keysOf(child, prefix ? `${prefix}.${key}` : key),
  );
}

function valuesOf(value: unknown): string[] {
  if (typeof value === 'string') return [value];
  if (typeof value !== 'object' || value === null) return [];
  return Object.values(value).flatMap(valuesOf);
}

describe('locales', () => {
  it('ships every supported language', () => {
    expect(Object.keys(resources).sort()).toEqual([...LANGUAGES].sort());
    expect(Object.keys(LANGUAGE_NAMES).sort()).toEqual([...LANGUAGES].sort());
  });

  const namespaces = Object.keys(resources.en) as (keyof typeof resources.en)[];

  it.each(LANGUAGES.filter((l) => l !== 'en'))('%s has exactly the keys of en', (language) => {
    for (const namespace of namespaces) {
      expect(keysOf(resources[language][namespace]).sort()).toEqual(
        keysOf(resources.en[namespace]).sort(),
      );
    }
  });

  it.each(LANGUAGES)('%s has no empty strings', (language) => {
    for (const text of valuesOf(resources[language])) {
      expect(text.trim()).not.toBe('');
    }
  });

  // Copy rules from the evidence base: the app suggests, it never prescribes,
  // and it never promises productivity or medical outcomes.
  const FORBIDDEN: Record<string, RegExp[]> = {
    'pt-BR': [/você precisa/i, /produtividade/i, /previne/i],
    es: [/necesitas/i, /productividad/i, /previene/i],
    en: [/you need to/i, /you must/i, /productivity/i, /prevents?\b/i],
  };

  it.each(LANGUAGES)('%s follows the health copy rules', (language) => {
    for (const text of valuesOf(resources[language])) {
      for (const pattern of FORBIDDEN[language] ?? []) {
        expect(text).not.toMatch(pattern);
      }
    }
  });
});

describe('resolveLanguage', () => {
  it('maps any Portuguese to pt-BR', () => {
    expect(resolveLanguage(['pt-PT', 'en'])).toBe('pt-BR');
    expect(resolveLanguage(['pt'])).toBe('pt-BR');
  });

  it('maps any Spanish to es', () => {
    expect(resolveLanguage(['es-419', 'en-US'])).toBe('es');
  });

  it('respects the order of preference', () => {
    expect(resolveLanguage(['fr-FR', 'en-GB', 'pt-BR'])).toBe('en');
  });

  it('falls back to English', () => {
    expect(resolveLanguage(['ja-JP', 'de'])).toBe('en');
    expect(resolveLanguage([])).toBe('en');
  });
});
