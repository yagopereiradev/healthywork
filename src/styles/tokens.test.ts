import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { contrastRatio } from './contrast';

// Vitest runs from the project root.
const css = readFileSync('src/styles/tokens.css', 'utf8');

type Tokens = Record<string, string>;

function parseTheme(theme: 'light' | 'dark'): Tokens {
  const block = new RegExp(`\\[data-theme='${theme}'\\]\\s*\\{([^}]*)\\}`).exec(css)?.[1];
  if (!block) throw new Error(`No token block for the ${theme} theme`);
  const tokens: Tokens = {};
  for (const [, name, value] of block.matchAll(/--hw-([a-z0-9-]+):\s*([^;]+);/g)) {
    if (name && value) tokens[name] = value.trim();
  }
  return tokens;
}

const MODULES = ['water', 'move', 'focus'] as const;

/** [foreground, background] pairs that carry text: WCAG AA needs 4.5:1. */
const TEXT_PAIRS: [string, string][] = [
  ['ink', 'bg'],
  ['ink', 'surface'],
  ['ink', 'raised'],
  ['ink-2', 'bg'],
  ['ink-2', 'surface'],
  ['ink-2', 'raised'],
  ['ink-2', 'water-soft'],
  ['move-ink-2', 'move-soft'],
  ['focus-ink-2', 'focus-soft'],
  ['inverse-on', 'inverse'],
  ['inverse-accent', 'inverse-raised'],
  ...MODULES.flatMap((m): [string, string][] => [
    [`${m}-on`, m],
    ['ink', `${m}-soft`],
    [`${m}-ink`, 'bg'],
    [`${m}-ink`, 'surface'],
    [`${m}-ink`, 'raised'],
    [`${m}-ink`, `${m}-soft`],
    ['solid-on', `${m}-solid`],
    ['solid-on', `${m}-deep`],
    [`${m}-muted`, `${m}-solid`],
    [`${m}-muted`, `${m}-deep`],
  ]),
];

/** Pairs that only need to be told apart (fills, borders of inputs, focus ring): 3:1. */
const GRAPHIC_PAIRS: [string, string][] = [
  ['ring', 'bg'],
  ['ring', 'surface'],
  ['control', 'surface'],
  ['control', 'bg'],
  ...MODULES.flatMap((m): [string, string][] => [
    [m, `${m}-soft`],
    [m, 'surface'],
    [m, 'bg'],
    ['solid-on', `${m}-solid`],
  ]),
];

describe.each(['light', 'dark'] as const)('%s theme tokens', (theme) => {
  const tokens = parseTheme(theme);
  const color = (name: string): string => {
    const value = tokens[name];
    if (!value) throw new Error(`Missing token --hw-${name} in the ${theme} theme`);
    return value;
  };

  it.each(TEXT_PAIRS)('%s on %s meets AA for text (4.5:1)', (fg, bg) => {
    expect(contrastRatio(color(fg), color(bg))).toBeGreaterThanOrEqual(4.5);
  });

  it.each(GRAPHIC_PAIRS)('%s against %s meets AA for graphics (3:1)', (fg, bg) => {
    expect(contrastRatio(color(fg), color(bg))).toBeGreaterThanOrEqual(3);
  });
});

describe('theme parity', () => {
  it('defines exactly the same tokens in both themes', () => {
    expect(Object.keys(parseTheme('dark')).sort()).toEqual(Object.keys(parseTheme('light')).sort());
  });
});
