import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { DataStore } from '@/data/store';
import { NextBreakCard } from '@/features/breaks/ui/NextBreakCard';
import { initI18n } from '@/i18n';
import { dayKey } from '@/lib/dates';
import { newTestStore, renderWithApp } from '@/test/renderWithApp';
import { useToasts } from '@/ui/toast/toastStore';
import type { ReminderState } from './domain/reminders';
import { RemindersProvider } from './RemindersProvider';
import { MeetingButton } from './ui/MeetingButton';
import { useMeetingSheet } from './ui/meetingSheetStore';
import { ReminderNotice } from './ui/ReminderNotice';
import { ReminderSurfaces } from './ui/ReminderSurfaces';
import { WaterBanner } from './ui/WaterBanner';

beforeAll(async () => {
  await initI18n('en');
});

beforeEach(() => {
  useToasts.setState({ toasts: [] });
  useMeetingSheet.setState({ open: false });
});

const now = () => Date.now();
const today = () => dayKey(now());
const MINUTE = 60_000;

/** Working hours that always contain the present moment, whenever the tests run. */
async function storeAtWork(): Promise<DataStore> {
  const store = newTestStore();
  await store.settings.update({
    workday: { start: '00:00', end: '23:59', days: [0, 1, 2, 3, 4, 5, 6] },
  });
  return store;
}

function saved(overrides: Partial<ReminderState>): ReminderState {
  return {
    day: today(),
    anchors: { water: now(), breaks: now() },
    snoozes: { water: null, breaks: null },
    prompts: { water: null, breaks: null },
    meeting: null,
    ...overrides,
  };
}

const getState = (store: DataStore) => store.session.get<ReminderState>('reminders');

function renderReminders(store: DataStore) {
  return renderWithApp(
    <RemindersProvider>
      <MeetingButton />
      <ReminderNotice />
      <WaterBanner />
      <NextBreakCard />
      <ReminderSurfaces />
    </RemindersProvider>,
    { store },
  );
}

describe('break reminder', () => {
  async function withBreakOnScreen() {
    const store = await storeAtWork();
    await store.session.set(
      'reminders',
      saved({ prompts: { water: null, breaks: { at: now(), type: 'neck-shoulders' } } }),
    );
    renderReminders(store);
    const dialog = await screen.findByRole('dialog', { name: 'Stretch neck and shoulders' });
    return { store, dialog };
  }

  it('shows the exercise full screen, with its steps and a countdown', async () => {
    const { dialog } = await withBreakOnScreen();

    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(within(dialog).getByText('Time for a break')).toBeInTheDocument();
    expect(within(dialog).getAllByRole('listitem')).toHaveLength(3);
    expect(within(dialog).getByText('Tilt your head to each side, 10 seconds')).toBeInTheDocument();
    expect(within(dialog).getByRole('img', { name: /left$/ })).toBeInTheDocument();
    // Focus moves in an effect, just after the dialog is in the page.
    await waitFor(() => expect(within(dialog).getByRole('button', { name: 'Done' })).toHaveFocus());
  });

  it('logs the suggested break on "Done", with the type the person followed', async () => {
    const { store, dialog } = await withBreakOnScreen();

    await userEvent.click(within(dialog).getByRole('button', { name: 'Done' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    const [entry] = await store.breaks.listBetween(today(), today());
    expect(entry).toMatchObject({ type: 'neck-shoulders', origin: 'reminder', durationSec: 60 });
    expect(await screen.findByText('Break done')).toBeInTheDocument();
  });

  it('comes back in 10 minutes when postponed, and logs nothing', async () => {
    const { store, dialog } = await withBreakOnScreen();
    const before = now();

    await userEvent.click(within(dialog).getByRole('button', { name: 'Postpone 10 min' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    const state = await getState(store);
    expect(state?.prompts.breaks).toBeNull();
    expect(state?.snoozes.breaks?.until).toBeGreaterThanOrEqual(before + 10 * MINUTE);
    expect(await store.breaks.listBetween(today(), today())).toEqual([]);
  });

  it('starts a new interval when skipped, without logging or scolding', async () => {
    const { store, dialog } = await withBreakOnScreen();
    const before = now();

    await userEvent.click(within(dialog).getByRole('button', { name: 'Skip' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    const state = await getState(store);
    expect(state?.anchors.breaks).toBeGreaterThanOrEqual(before);
    expect(state?.snoozes.breaks).toBeNull();
    expect(await store.breaks.listBetween(today(), today())).toEqual([]);
    expect(useToasts.getState().toasts).toEqual([]);
  });

  it('explains the exercise with the study that fits it', async () => {
    const { dialog } = await withBreakOnScreen();

    await userEvent.click(within(dialog).getByRole('button', { name: 'Why?' }));

    const why = await screen.findByRole('dialog', { name: 'Why such a short break?' });
    expect(within(why).getByText(/no significant improvement in performance/)).toBeInTheDocument();
  });
});

describe('up next', () => {
  it('shows the coming break and opens it on request', async () => {
    const store = await storeAtWork();
    renderReminders(store);

    const start = await screen.findByRole('button', { name: 'Do it now' });
    expect(screen.getByText(/^Up next · break in \d+ min$/)).toBeInTheDocument();
    await userEvent.click(start);

    expect(await screen.findByRole('dialog', { name: 'Get up and walk' })).toBeInTheDocument();
  });
});

describe('water reminder', () => {
  async function withWaterReminder() {
    const store = await storeAtWork();
    await store.session.set(
      'reminders',
      saved({ prompts: { water: { at: now() }, breaks: null } }),
    );
    renderReminders(store);
    const banner = await screen.findByRole('status', { name: 'How about a glass of water?' });
    return { store, banner };
  }

  it('offers the one-tap answer and says how much is left', async () => {
    const { store, banner } = await withWaterReminder();
    expect(within(banner).getByText('2,000 ml to go for your goal today.')).toBeInTheDocument();

    await userEvent.click(within(banner).getByRole('button', { name: '+ 250 ml' }));

    await waitFor(() =>
      expect(screen.queryByRole('status', { name: 'How about a glass of water?' })).toBeNull(),
    );
    expect(await store.water.listBetween(today(), today())).toHaveLength(1);
  });

  it('can be postponed or dismissed', async () => {
    const { store, banner } = await withWaterReminder();

    await userEvent.click(within(banner).getByRole('button', { name: 'Postpone 10 min' }));

    await waitFor(async () => expect((await getState(store))?.snoozes.water).not.toBeNull());
    expect((await getState(store))?.prompts.water).toBeNull();
  });
});

describe('in a meeting', () => {
  it('silences reminders for the chosen time and shows when they come back', async () => {
    const store = await storeAtWork();
    renderReminders(store);
    const before = now();

    await userEvent.click(await screen.findByRole('button', { name: /In a meeting/ }));
    const sheet = await screen.findByRole('dialog', { name: 'In a meeting?' });
    expect(within(sheet).getByRole('radio', { name: /30 minutes/ })).toBeChecked();
    await userEvent.click(within(sheet).getByRole('radio', { name: /1 hour/ }));
    await userEvent.click(within(sheet).getByRole('button', { name: 'Silence reminders' }));

    expect(await screen.findByText('Reminders are silenced')).toBeInTheDocument();
    const state = await getState(store);
    expect(state?.meeting?.until).toBeGreaterThanOrEqual(before + 60 * MINUTE);
    // No break is on the way while silenced.
    expect(screen.queryByRole('button', { name: 'Do it now' })).not.toBeInTheDocument();
  });

  it('turns reminders back on with "I am back"', async () => {
    const store = await storeAtWork();
    await store.session.set('reminders', saved({ meeting: { startedAt: now(), until: null } }));
    renderReminders(store);

    expect(await screen.findByText('They come back when you say so.')).toBeInTheDocument();
    await userEvent.click(screen.getAllByRole('button', { name: /I am back/ })[0]!);

    await waitFor(async () => expect((await getState(store))?.meeting).toBeNull());
    await waitFor(() => expect(screen.queryByText('Reminders are silenced')).toBeNull());
  });
});

describe('outside working hours', () => {
  it('says reminders are quiet and when they return', async () => {
    const store = newTestStore();
    // No working days at all: always outside working hours.
    await store.settings.update({ workday: { days: [] } });
    renderReminders(store);

    expect(await screen.findByText('Outside working hours')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Do it now' })).not.toBeInTheDocument();
  });
});
