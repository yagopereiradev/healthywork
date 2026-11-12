import { readFileSync } from 'node:fs';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { initI18n } from '@/i18n';
import { addDays, dayKey, dayStart } from '@/lib/dates';
import { newTestStore, renderWithApp } from '@/test/renderWithApp';
import { useToasts } from '@/ui/toast/toastStore';
import { mondayOf } from './domain/week';
import type * as SummaryCardModule from './render/summaryCard';
import { CARD_COLORS, fitFontSize, type SummaryCard } from './render/summaryCard';
import { ShareSheet } from './ui/ShareSheet';

// jsdom has no canvas: the drawing is replaced, and the card it was asked to
// draw is kept so the tests can read it.
const drawn: SummaryCard[] = [];
vi.mock('./render/summaryCard', async (original) => ({
  ...(await original<typeof SummaryCardModule>()),
  renderSummaryPng: vi.fn(async (card: SummaryCard) => {
    drawn.push(card);
    return new Blob(['png'], { type: 'image/png' });
  }),
}));

beforeAll(async () => {
  await initI18n('en');
});

beforeEach(() => {
  drawn.length = 0;
  useToasts.setState({ toasts: [] });
  vi.stubGlobal('URL', {
    ...URL,
    createObjectURL: vi.fn(() => 'blob:summary'),
    revokeObjectURL: vi.fn(),
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const today = () => dayKey(Date.now());
const monday = () => mondayOf(today());
/** Noon on a day of this week (0 = Monday), or of last week with `weeksAgo`. */
const noon = (weekdayIndex: number, weeksAgo = 0) =>
  dayStart(addDays(monday(), weekdayIndex - 7 * weeksAgo)).getTime() + 12 * 3_600_000;

/** Every day is a working day here, so the tests pass on any day of the week. */
async function seeded() {
  const store = newTestStore();
  await store.settings.update({ workday: { days: [0, 1, 2, 3, 4, 5, 6] } });
  // Monday of this week: goal reached, one break, a 50-minute block.
  await store.water.add({ at: noon(0), amountMl: 1500, drink: 'water' });
  await store.water.add({ at: noon(0) + 1000, amountMl: 900, drink: 'coffee' });
  await store.breaks.add({ at: noon(0), type: 'walk', durationSec: 300, origin: 'reminder' });
  await store.focus.add({ at: noon(0), plannedSec: 3000, focusedSec: 3000, completed: true });
  // Last week: a different picture.
  await store.water.add({ at: noon(2, 1), amountMl: 2000, drink: 'water' });
  await store.water.add({ at: noon(3, 1), amountMl: 2000, drink: 'water' });
  return store;
}

describe('ShareSheet', () => {
  it('draws the week with its numbers and a full description for screen readers', async () => {
    renderWithApp(<ShareSheet open onClose={() => {}} />, { store: await seeded() });

    const image = await screen.findByRole('img');
    const card = drawn.at(-1)!;
    expect(card.heading).toBe('My week at work');
    expect(card.liters).toBe('2.4 L');
    expect(card.waterLabel).toBe('of water');
    expect(card.breaks).toBe('1');
    expect(card.breaksLabel).toBe('movement break');
    expect(card.focus).toBe('50 min');
    expect(card.daysLine).toBe('1 day on my water goal');
    expect(card.footer).toBe('Free and open source · your data stays on your device');
    expect(card.days).toHaveLength(7);
    expect(card.days[0]).toEqual({ letter: 'M', state: 'reached' });

    expect(image).toHaveAccessibleName(
      expect.stringContaining('2.4 L of water, 1 movement break, 50 min of focus.'),
    );
  });

  it('switches to last week', async () => {
    renderWithApp(<ShareSheet open onClose={() => {}} />, { store: await seeded() });
    await screen.findByRole('img');

    await userEvent.click(screen.getByRole('radio', { name: 'Last week' }));

    await waitFor(() => expect(drawn.at(-1)?.liters).toBe('4.0 L'));
    const card = drawn.at(-1)!;
    expect(card.daysLine).toBe('2 days on my water goal');
    expect(card.days.map((day) => day.state)).toEqual([
      'missed',
      'missed',
      'reached',
      'reached',
      'missed',
      'missed',
      'missed',
    ]);
  });

  it('downloads the image as a PNG named after the week', async () => {
    const clicked: string[] = [];
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
      this: HTMLAnchorElement,
    ) {
      clicked.push(this.download);
    });
    renderWithApp(<ShareSheet open onClose={() => {}} />, { store: await seeded() });
    await screen.findByRole('img');

    await userEvent.click(screen.getByRole('button', { name: 'Download PNG' }));

    expect(clicked).toEqual([`healthywork-week-${monday()}.png`]);
    expect(await screen.findByText('Image downloaded')).toBeInTheDocument();
  });

  it('says so when the week has nothing logged, and still makes the image', async () => {
    const store = newTestStore();
    renderWithApp(<ShareSheet open onClose={() => {}} />, { store });

    const dialog = await screen.findByRole('dialog', { name: 'Weekly summary' });
    expect(await within(dialog).findByText(/The image comes out with zeros/)).toBeInTheDocument();
    await screen.findByRole('img');
    expect(drawn.at(-1)).toMatchObject({ liters: '0.0 L', breaks: '0', focus: '0 min' });
    expect(drawn.at(-1)?.daysLine).toBe('No days on my water goal yet');
  });
});

describe('the image', () => {
  it('uses the water colours of the brand, the same as the tokens', () => {
    // Vitest runs from the project root.
    const tokens = readFileSync('src/styles/tokens.css', 'utf8');
    const light = /\[data-theme='light'\]\s*\{([^}]*)\}/.exec(tokens)?.[1] ?? '';
    const token = (name: string) => new RegExp(`--hw-${name}:\\s*(#[0-9a-f]{6});`).exec(light)?.[1];

    expect(CARD_COLORS.background).toBe(token('water-solid'));
    expect(CARD_COLORS.deep).toBe(token('water-deep'));
    expect(CARD_COLORS.muted).toBe(token('water-muted'));
    expect(CARD_COLORS.white).toBe(token('solid-on'));
  });

  it('shrinks a long number until it fits, and leaves a short one alone', () => {
    // A stand-in for the canvas: every character is 0.6 of the font size wide.
    const widthOf = (value: string) => (size: number) => value.length * size * 0.6;

    expect(fitFontSize(widthOf('24'), 104, 364)).toBe(104);
    const shrunk = fitFontSize(widthOf('100h05'), 104, 364);
    expect(shrunk).toBeLessThan(104);
    expect(widthOf('100h05')(shrunk)).toBeLessThanOrEqual(364);
    // It never becomes unreadable.
    expect(fitFontSize(widthOf('x'.repeat(200)), 104, 364)).toBe(24);
  });
});
