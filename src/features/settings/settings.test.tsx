import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createBackup } from '@/data/backup';
import { DEFAULT_SETTINGS } from '@/data/settings';
import type { DataStore } from '@/data/store';
import { initI18n } from '@/i18n';
import { dayKey } from '@/lib/dates';
import { newTestStore, renderWithApp } from '@/test/renderWithApp';
import { useToasts } from '@/ui/toast/toastStore';
import { backupFileName, readBackupFile } from './dataFile';
import { SettingsPage } from './ui/SettingsPage';

beforeAll(async () => {
  await initI18n('en');
});

beforeEach(() => {
  useToasts.setState({ toasts: [] });
});

const now = () => Date.now();
const today = () => dayKey(now());
const row = (name: RegExp) => screen.findByRole('button', { name });
const closed = () => waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());

async function open(store: DataStore = newTestStore()) {
  renderWithApp(<SettingsPage />, { store });
  await row(/Daily goal: 2,000 ml/);
  return store;
}

describe('Settings', () => {
  it('shows every group with its current value, and the health notice', async () => {
    await open();

    expect(screen.getByRole('button', { name: /Remind every: 45 min/ })).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Pace: 5 min every 30 · recommended/ }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Kinds of break: 5 on/ })).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Default block: 25 min \+ 5 of break/ }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Daily goal: 4h/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Hours: 09:00 to 18:00/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Days: Monday to Friday/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Theme: Same as system/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Language: Automatic/ })).toBeInTheDocument();
    expect(screen.getByText(/HealthyWork does not replace medical advice/)).toBeInTheDocument();
    expect(screen.getByText(/Nothing is sent to any server/)).toBeInTheDocument();
  });

  it('changes the water goal to one of the usual amounts', async () => {
    const store = await open();

    await userEvent.click(await row(/Daily goal: 2,000 ml/));
    const sheet = await screen.findByRole('dialog', { name: 'Daily goal' });
    expect(within(sheet).getByText(/It is a suggestion/)).toBeInTheDocument();
    await userEvent.click(within(sheet).getByRole('radio', { name: '2,500 ml' }));
    await userEvent.click(within(sheet).getByRole('button', { name: 'Save' }));

    await closed();
    expect((await store.settings.get()).water.goalMl).toBe(2500);
    expect(await row(/Daily goal: 2,500 ml/)).toBeInTheDocument();
  });

  it('accepts a typed goal and refuses one that makes no sense', async () => {
    const store = await open();

    await userEvent.click(await row(/Daily goal: 2,000 ml/));
    const sheet = await screen.findByRole('dialog', { name: 'Daily goal' });
    await userEvent.click(within(sheet).getByRole('radio', { name: 'Another amount' }));
    await userEvent.type(within(sheet).getByLabelText('Goal in ml'), '90');
    await userEvent.click(within(sheet).getByRole('button', { name: 'Save' }));
    expect(within(sheet).getByRole('alert')).toHaveTextContent('between 500 and 6,000 ml');
    expect((await store.settings.get()).water.goalMl).toBe(2000);

    await userEvent.clear(within(sheet).getByLabelText('Goal in ml'));
    await userEvent.type(within(sheet).getByLabelText('Goal in ml'), '1800');
    await userEvent.click(within(sheet).getByRole('button', { name: 'Save' }));

    await closed();
    expect((await store.settings.get()).water.goalMl).toBe(1800);
  });

  it('marks only the studied pace as recommended', async () => {
    const store = await open();

    await userEvent.click(await row(/^Pace/));
    const sheet = await screen.findByRole('dialog', { name: 'Pace' });
    expect(within(sheet).getByRole('radio', { name: /5 min every 30, recommended/ })).toBeChecked();
    expect(within(sheet).getAllByText('recommended')).toHaveLength(1);
    await userEvent.click(within(sheet).getByRole('radio', { name: '5 min every 50' }));
    await userEvent.click(within(sheet).getByRole('button', { name: 'Save' }));

    await closed();
    expect((await store.settings.get()).breaks.everyMin).toBe(50);
    expect(await row(/Pace: 5 min every 50$/)).toBeInTheDocument();
  });

  it('keeps at least one kind of break on', async () => {
    const store = await open();

    await userEvent.click(await row(/Kinds of break/));
    const sheet = await screen.findByRole('dialog', { name: 'Kinds of break' });
    for (const toggle of within(sheet).getAllByRole('switch')) await userEvent.click(toggle);
    await userEvent.click(within(sheet).getByRole('button', { name: 'Save' }));
    expect(within(sheet).getByRole('alert')).toHaveTextContent('Keep at least one kind on.');

    await userEvent.click(within(sheet).getByRole('switch', { name: 'Rest your eyes' }));
    await userEvent.click(within(sheet).getByRole('switch', { name: 'Get up and walk' }));
    await userEvent.click(within(sheet).getByRole('button', { name: 'Save' }));

    await closed();
    expect((await store.settings.get()).breaks.types).toEqual(['walk', 'eyes']);
  });

  it('changes the working days', async () => {
    const store = await open();

    await userEvent.click(await row(/Days: Monday to Friday/));
    const sheet = await screen.findByRole('dialog', { name: 'Days' });
    expect(within(sheet).getByRole('button', { name: 'Monday' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await userEvent.click(within(sheet).getByRole('button', { name: 'Friday' }));
    await userEvent.click(within(sheet).getByRole('button', { name: 'Save' }));

    await closed();
    expect((await store.settings.get()).workday.days).toEqual([1, 2, 3, 4]);
    expect(await row(/Days: 4 days/)).toBeInTheDocument();
  });

  it('changes the language right away', async () => {
    const store = await open();

    await userEvent.click(await row(/Language: Automatic/));
    const sheet = await screen.findByRole('dialog', { name: 'Language' });
    await userEvent.click(within(sheet).getByRole('radio', { name: 'Español' }));
    await userEvent.click(within(sheet).getByRole('button', { name: 'Save' }));

    await closed();
    expect((await store.settings.get()).appearance.language).toBe('es');
  });
});

describe('your data', () => {
  async function seeded() {
    const store = newTestStore();
    await store.settings.update({ water: { goalMl: 1800 }, onboardingDone: true });
    await store.water.add({ at: now(), amountMl: 250, drink: 'water' });
    await store.breaks.add({ at: now(), type: null, durationSec: 0, origin: 'manual' });
    return store;
  }

  it('asks before erasing, with focus on Cancel, and then erases everything', async () => {
    const store = await seeded();
    renderWithApp(<SettingsPage />, { store });

    await userEvent.click(await row(/Erase everything/));
    const sheet = await screen.findByRole('dialog', { name: 'Erase everything?' });
    expect(within(sheet).getByText(/This cannot be undone/)).toBeInTheDocument();
    expect(within(sheet).getByRole('button', { name: 'Cancel' })).toHaveFocus();

    await userEvent.click(within(sheet).getByRole('button', { name: 'Cancel' }));
    await closed();
    expect(await store.water.listBetween(today(), today())).toHaveLength(1);

    await userEvent.click(await row(/Erase everything/));
    const again = await screen.findByRole('dialog', { name: 'Erase everything?' });
    await userEvent.click(within(again).getByRole('button', { name: 'Erase everything' }));

    await waitFor(async () => expect(await store.water.listBetween(today(), today())).toEqual([]));
    expect(await store.settings.get()).toEqual(DEFAULT_SETTINGS);
    expect(await screen.findByText('Everything erased')).toBeInTheDocument();
  });

  it('imports a backup after showing what is in it and asking', async () => {
    const backup = await (await seeded()).exportBackup(now());
    const target = newTestStore();
    await target.settings.update({ onboardingDone: true });
    renderWithApp(<SettingsPage />, { store: target });
    await row(/Daily goal: 2,000 ml/);

    const file = new File([JSON.stringify(backup)], 'backup.json', { type: 'application/json' });
    await userEvent.upload(
      screen.getByLabelText('Import from a file', { selector: 'input' }),
      file,
    );

    const sheet = await screen.findByRole('dialog', { name: 'Import this file?' });
    expect(
      within(sheet).getByText('The file has 1 water records, 1 breaks and 0 focus blocks.'),
    ).toBeInTheDocument();
    // Nothing changes before the person confirms.
    expect((await target.settings.get()).water.goalMl).toBe(2000);

    await userEvent.click(within(sheet).getByRole('button', { name: 'Replace my data' }));

    await waitFor(async () => expect((await target.settings.get()).water.goalMl).toBe(1800));
    expect(await target.water.listBetween(today(), today())).toHaveLength(1);
    expect(await screen.findByText('Data imported')).toBeInTheDocument();
  });

  it('refuses a file that is not a backup, and says nothing was changed', async () => {
    const store = await seeded();
    renderWithApp(<SettingsPage />, { store });
    await row(/Daily goal: 1,800 ml/);

    const file = new File(['{"hello":"world"}'], 'other.json', { type: 'application/json' });
    await userEvent.upload(
      screen.getByLabelText('Import from a file', { selector: 'input' }),
      file,
    );

    expect(
      await screen.findByText('That file is not a HealthyWork backup. Nothing was changed.'),
    ).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(await store.water.listBetween(today(), today())).toHaveLength(1);
  });
});

describe('backup files', () => {
  it('names the file with the day it was exported', () => {
    expect(backupFileName(new Date(2026, 10, 12, 15).getTime())).toBe(
      'healthywork-backup-2026-11-12.json',
    );
  });

  it('tells each problem apart', async () => {
    const good = createBackup(
      { settings: DEFAULT_SETTINGS, water: [], breaks: [], focus: [] },
      now(),
    );
    const read = (content: string) => readBackupFile(new Blob([content]));

    expect((await read(JSON.stringify(good))).ok).toBe(true);
    expect(await read('not json at all')).toEqual({ ok: false, problem: 'unreadable' });
    expect(await read('{"app":"something-else"}')).toEqual({
      ok: false,
      problem: 'not-healthywork',
    });
    expect(await read(JSON.stringify({ ...good, formatVersion: 99 }))).toEqual({
      ok: false,
      problem: 'newer-version',
    });
    expect(await read(JSON.stringify({ ...good, data: { water: 'nope' } }))).toEqual({
      ok: false,
      problem: 'invalid-data',
    });
  });
});
