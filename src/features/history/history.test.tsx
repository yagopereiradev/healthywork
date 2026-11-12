import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeAll, describe, expect, it } from 'vitest';
import { initI18n } from '@/i18n';
import { addDays, dayKey, dayStart, formatPeriod } from '@/lib/dates';
import { formatLiters } from '@/lib/format';
import { newTestStore, renderWithApp } from '@/test/renderWithApp';
import { HistoryPage } from './ui/HistoryPage';

beforeAll(async () => {
  await initI18n('en');
});

const today = () => dayKey(Date.now());
/** Noon on a day some days ago, so the record never slips into a neighbouring day. */
const noon = (daysAgo: number) => dayStart(addDays(today(), -daysAgo)).getTime() + 12 * 3_600_000;

describe('HistoryPage', () => {
  it('invites to start when the period is empty', async () => {
    renderWithApp(<HistoryPage />);
    expect(await screen.findByText('Nothing in this period yet')).toBeInTheDocument();
  });

  it('shows one card per module with its total, and a bar for every day', async () => {
    const store = newTestStore();
    await store.water.add({ at: noon(0), amountMl: 1500, drink: 'water' });
    await store.water.add({ at: noon(1), amountMl: 2000, drink: 'tea' });
    await store.breaks.add({ at: noon(1), type: 'walk', durationSec: 300, origin: 'reminder' });
    await store.focus.add({ at: noon(2), plannedSec: 3000, focusedSec: 3000, completed: true });
    // Ten days ago: only in the 30-day view.
    await store.water.add({ at: noon(10), amountMl: 500, drink: 'water' });
    renderWithApp(<HistoryPage />, { store });

    const water = (await screen.findByRole('heading', { name: 'Water' })).closest('section')!;
    expect(within(water).getByText('3.5 L')).toBeInTheDocument();
    expect(within(water).getAllByRole('listitem')).toHaveLength(7);
    expect(within(water).getByText(/2,000 ml, goal reached$/)).toBeInTheDocument();

    const breaks = screen.getByRole('heading', { name: 'Breaks' }).closest('section')!;
    expect(within(breaks).getByText('1 taken')).toBeInTheDocument();
    const focus = screen.getByRole('heading', { name: 'Focus' }).closest('section')!;
    expect(within(focus).getByText('50 min')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('radio', { name: '30 days' }));

    const month = (await screen.findByText('4.0 L')).closest('section')!;
    expect(within(month).getAllByRole('listitem')).toHaveLength(30);
  });
});

describe('formats', () => {
  it('writes a period the way each language says it', () => {
    expect(formatPeriod('2026-11-06', '2026-11-12', 'pt-BR')).toBe('6 a 12 de novembro');
    expect(formatPeriod('2026-11-06', '2026-11-12', 'en')).toMatch(/^November 6\s–\s12$/);
    expect(formatPeriod('2026-10-14', '2026-11-12', 'pt-BR')).toBe(
      '14 de outubro a 12 de novembro',
    );
  });

  it('writes litres with one decimal in the local way', () => {
    expect(formatLiters(12600, 'pt-BR')).toBe('12,6');
    expect(formatLiters(12600, 'en')).toBe('12.6');
    expect(formatLiters(4000, 'en')).toBe('4.0');
  });
});
