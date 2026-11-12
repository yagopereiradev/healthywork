import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS } from '@/data/settings';
import type { DataStore } from '@/data/store';
import { RemindersProvider } from '@/features/notifications/RemindersProvider';
import { ReminderSurfaces } from '@/features/notifications/ui/ReminderSurfaces';
import { NowCard } from '@/features/today/ui/NowCard';
import { initI18n } from '@/i18n';
import { dayKey } from '@/lib/dates';
import { newTestStore, renderWithApp } from '@/test/renderWithApp';
import { useToasts } from '@/ui/toast/toastStore';
import { planFrom, startBlock, type FocusState } from './domain/timer';
import { FocusProvider } from './FocusProvider';
import { FocusPage } from './ui/FocusPage';

beforeAll(async () => {
  await initI18n('en');
});

beforeEach(() => {
  useToasts.setState({ toasts: [] });
});

const MINUTE = 60_000;
const now = () => Date.now();
const today = () => dayKey(now());
const plan = planFrom(DEFAULT_SETTINGS.focus);
const getSession = (store: DataStore) => store.session.get<FocusState>('focus');

/** Working hours that always contain the present moment, whenever the tests run. */
async function storeAtWork(): Promise<DataStore> {
  const store = newTestStore();
  await store.settings.update({
    workday: { start: '00:00', end: '23:59', days: [0, 1, 2, 3, 4, 5, 6] },
  });
  return store;
}

function renderFocus(store: DataStore) {
  return renderWithApp(
    <RemindersProvider>
      <FocusProvider>
        <FocusPage />
        <NowCard roomy={false} />
        <ReminderSurfaces />
      </FocusProvider>
    </RemindersProvider>,
    { store },
  );
}

const page = () => screen.findByRole('radiogroup', { name: 'Block length' });

describe('Focus', () => {
  it('starts idle on block 1 of 4 with the default 25 / 5', async () => {
    renderFocus(await storeAtWork());
    await page();

    expect(screen.getByRole('radio', { name: '25 minutes of focus, 5 of break' })).toBeChecked();
    expect(screen.getByRole('img', { name: '25 minutes of focus ahead' })).toBeInTheDocument();
    expect(screen.getByText('Block 1 of 4')).toBeInTheDocument();
    expect(screen.getByText('5-minute break · walk')).toBeInTheDocument();
  });

  it('starts, pauses and resumes a block', async () => {
    const store = await storeAtWork();
    renderFocus(store);
    await page();

    await userEvent.click(screen.getAllByRole('button', { name: /Start block/ })[0]!);
    await waitFor(async () => expect((await getSession(store))?.phase).toBe('focus'));
    expect(await screen.findAllByRole('button', { name: /Pause/ })).not.toHaveLength(0);
    expect(screen.getByText('Now · focus, block 1 of 4')).toBeInTheDocument();

    await userEvent.click(screen.getAllByRole('button', { name: /Pause/ })[0]!);
    expect(await screen.findByText('Paused · block 1 of 4')).toBeInTheDocument();
    const paused = await getSession(store);
    expect(paused?.phase === 'focus' && paused.pausedAt).not.toBeNull();

    await userEvent.click(screen.getAllByRole('button', { name: /Resume/ })[0]!);
    await waitFor(async () => {
      const session = await getSession(store);
      expect(session?.phase === 'focus' && session.pausedAt).toBeNull();
    });
  });

  it('cannot change the block length while a block is on the clock', async () => {
    const store = await storeAtWork();
    await store.session.set('focus', startBlock(plan, 1, now()));
    renderFocus(store);
    await page();

    for (const radio of screen.getAllByRole('radio')) expect(radio).toBeDisabled();
  });

  it('switches preset and saves it as the default block', async () => {
    const store = await storeAtWork();
    renderFocus(store);
    await page();

    await userEvent.click(screen.getByRole('radio', { name: '50 minutes of focus, 10 of break' }));

    await waitFor(async () =>
      expect((await store.settings.get()).focus).toMatchObject({ focusMin: 50, breakMin: 10 }),
    );
    expect(await screen.findByRole('img', { name: '50 minutes of focus ahead' })).toBeVisible();
    expect(screen.getByText('10-minute break · walk')).toBeInTheDocument();
  });

  it('accepts a block of the person’s own and refuses one that makes no sense', async () => {
    const store = await storeAtWork();
    renderFocus(store);
    await page();

    await userEvent.click(screen.getByRole('radio', { name: 'Other' }));
    const sheet = await screen.findByRole('dialog', { name: 'A block your way' });
    const focusInput = within(sheet).getByLabelText('Focus, in minutes');

    await userEvent.clear(focusInput);
    await userEvent.type(focusInput, '3');
    await userEvent.click(within(sheet).getByRole('button', { name: 'Use this block' }));
    expect(within(sheet).getByRole('alert')).toHaveTextContent('Use 5 to 120 minutes of focus');

    await userEvent.clear(focusInput);
    await userEvent.type(focusInput, '40');
    await userEvent.clear(within(sheet).getByLabelText('Break, in minutes'));
    await userEvent.type(within(sheet).getByLabelText('Break, in minutes'), '8');
    await userEvent.click(within(sheet).getByRole('button', { name: 'Use this block' }));

    await waitFor(async () =>
      expect((await store.settings.get()).focus).toMatchObject({ focusMin: 40, breakMin: 8 }),
    );
    expect(await screen.findByRole('radio', { name: /^Other: 40 minutes/ })).toBeChecked();
  });

  it('ends early, logging what was focused', async () => {
    const store = await storeAtWork();
    await store.session.set('focus', startBlock(plan, 1, now() - 12 * MINUTE));
    renderFocus(store);
    await page();

    await userEvent.click(screen.getByRole('button', { name: 'End' }));

    expect(await screen.findByText('Focus ended · 12 minutes logged')).toBeInTheDocument();
    expect(await getSession(store)).toBeUndefined();
    const [entry] = await store.focus.listBetween(today(), today());
    expect(entry).toMatchObject({ completed: false, plannedSec: 1500 });
    expect(entry?.focusedSec).toBeGreaterThanOrEqual(720);
  });

  it('logs nothing for a block ended in its first minute', async () => {
    const store = await storeAtWork();
    await store.session.set('focus', startBlock(plan, 1, now() - 20_000));
    renderFocus(store);
    await page();

    await userEvent.click(screen.getByRole('button', { name: 'End' }));

    expect(await screen.findByText('Focus ended')).toBeInTheDocument();
    expect(await store.focus.listBetween(today(), today())).toEqual([]);
  });
});

describe('the end of a block', () => {
  it('logs the block, opens the break on its own and gets the next block ready', async () => {
    const store = await storeAtWork();
    // A block that reached its end a second ago.
    await store.session.set('focus', startBlock(plan, 1, now() - 25 * MINUTE - 1000));
    renderFocus(store);

    const dialog = await screen.findByRole('dialog', { name: 'Get up and walk' });
    // The break lasts as long as the block's break: 5 minutes.
    expect(within(dialog).getByRole('img', { name: /^[45]:\d\d left$/ })).toBeInTheDocument();

    const [block] = await store.focus.listBetween(dayKey(now() - 26 * MINUTE), today());
    expect(block).toMatchObject({ completed: true, plannedSec: 1500, focusedSec: 1500 });
    expect(await getSession(store)).toEqual({ phase: 'ready', plan, block: 2 });

    await userEvent.click(within(dialog).getByRole('button', { name: 'Done' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());

    const [taken] = await store.breaks.listBetween(today(), today());
    expect(taken).toMatchObject({ type: 'walk', origin: 'focus', durationSec: 300 });
    expect(screen.getAllByRole('button', { name: /Start block 2/ })).not.toHaveLength(0);
    expect(screen.getByText('Up next · block 2 of 4')).toBeInTheDocument();
  });

  it('ends the cycle after the fourth block', async () => {
    const store = await storeAtWork();
    await store.session.set('focus', startBlock(plan, 4, now() - 25 * MINUTE - 1000));
    renderFocus(store);

    expect(await screen.findByText('Cycle of 4 blocks complete')).toBeInTheDocument();
    await waitFor(async () => expect(await getSession(store)).toBeUndefined());
  });

  it('logs a block that ended while the app was away, without a break out of nowhere', async () => {
    const store = await storeAtWork();
    await store.session.set('focus', startBlock(plan, 1, now() - 3 * 60 * MINUTE));
    renderFocus(store);

    await waitFor(async () =>
      expect(await getSession(store)).toEqual({ phase: 'ready', plan, block: 2 }),
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('does not finish a paused block, however long it stays paused', async () => {
    const store = await storeAtWork();
    const paused: FocusState = {
      ...startBlock(plan, 1, now() - 2 * 60 * MINUTE),
      pausedAt: now() - 2 * 60 * MINUTE + 10 * MINUTE,
    };
    await store.session.set('focus', paused);
    renderFocus(store);
    await page();

    expect(await screen.findByText('Paused · block 1 of 4')).toBeInTheDocument();
    expect(await getSession(store)).toEqual(paused);
    expect(await store.focus.listBetween(dayKey(now() - 3 * 60 * MINUTE), today())).toEqual([]);
  });
});
