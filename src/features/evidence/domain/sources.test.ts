import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { LANGUAGES } from '@/data/settings';
import { resources } from '@/i18n/resources';
import { EVIDENCE, type EvidenceTopic } from './sources';

// Vitest runs from the project root.
const evidenceDoc = readFileSync('docs/EVIDENCE.md', 'utf8');
const topics = Object.keys(EVIDENCE) as EvidenceTopic[];

describe('evidence sources', () => {
  it.each(topics)('every link cited for %s is in docs/EVIDENCE.md', (topic) => {
    for (const source of EVIDENCE[topic]) {
      expect(evidenceDoc).toContain(`(${source.url})`);
    }
  });

  it.each(LANGUAGES)('%s has the text for every topic and every source', (language) => {
    const texts = resources[language].evidence;
    for (const topic of topics) {
      const section = texts[topic];
      for (const field of ['eyebrow', 'question', 'finding', 'limit'] as const) {
        expect(section[field].trim()).not.toBe('');
      }
      expect(Object.keys(section.sources).sort()).toEqual(
        EVIDENCE[topic].map((source) => source.id).sort(),
      );
    }
  });

  it('states the sample size wherever the study is small', () => {
    for (const language of LANGUAGES) {
      expect(resources[language].evidence.breaks.limit).toContain('11');
      expect(resources[language].evidence.focus.limit).toContain('87');
      expect(resources[language].evidence.eyes.limit).toContain('29');
    }
  });
});
