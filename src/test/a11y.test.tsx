import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axe from 'axe-core';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { App } from '@/app/App';
import type { DataStore } from '@/data/store';
import type { ReminderState } from '@/features/notifications/domain/reminders';
import { initI18n } from '@/i18n';
import { dayKey } from '@/lib/dates';
import { useToasts } from '@/ui/toast/toastStore';
import { newTestStore } from './renderWithApp';

/**
 * Runs axe-core over the whole document. jsdom does not lay anything out, so
 * colour contrast cannot be checked here: tokens.test.ts covers every colour
 * pair, and Lighthouse checks the rendered page.
 */
async function expectNoViolations() {
  const results = await axe.run(document.body, {
    rules: { 'color-contrast': { enabled: false } },
  });
  const summary = results.violations.map(
    (violation) =>
      `${violation.id}: ${violation.help} -> ${violation.nodes.map((node) => node.html).join(' | ')}`,
  );
  expect(summary).toEqual([]);
}

beforeAll(async () => {
  await initI18n('en');
});

beforeEach(() => {
  useToasts.setState({ toasts: [] });
});

async function onboardedStore(): Promise<DataStore> {
  const store = newTestStore();
  await store.settings.update({
    onboardingDone: true,
    workday: { start: '00:00', end: '23:59', days: [0, 1, 2, 3, 4, 5, 6] },
  });
  const now = Date.now();
  await store.water.add({ at: now, amountMl: 250, drink: 'water' });
  await store.breaks.add({ at: now, type: 'walk', durationSec: 300, origin: 'reminder' });
  await store.focus.add({ at: now, plannedSec: 1500, focusedSec: 1500, completed: true });
  return store;
}

function open(path: string, store: DataStore) {
  window.history.pushState({}, '', path);
  return render(<App store={store} />);
}

describe('accessibility', () => {
  it.each([
    ['/', 'Today'],
    ['/focus', 'Focus'],
    ['/history', 'History'],
    ['/settings', 'Settings'],
  ])('%s has no violations', async (path, title) => {
    open(path, await onboardedStore());
    await screen.findByRole('heading', { level: 1, name: title });
    // Let the data behind the screen arrive before judging it.
    await waitFor(() => expect(screen.queryByRole('status', { name: 'Loading' })).toBeNull());
    await expectNoViolations();
  });

  it('onboarding has no violations on any step', async () => {
    open('/', newTestStore());
    await screen.findByRole('heading', { level: 1, name: /How much water/ });
    await expectNoViolations();

    await userEvent.click(screen.getByRole('button', { name: 'Continue' }));
    await screen.findByRole('heading', { level: 1, name: /working hours/ });
    await expectNoViolations();

    await userEvent.click(screen.getByRole('button', { name: 'Continue' }));
    await screen.findByRole('heading', { level: 1, name: /notifications/ });
    await expectNoViolations();
  });

  it('a sheet has no violations', async () => {
    open('/', await onboardedStore());
    await userEvent.click(await screen.findByRole('button', { name: 'Why? Water' }));
    await screen.findByRole('dialog', { name: /How much water/ });
    await expectNoViolations();
  });

  it('the break screen has no violations', async () => {
    const store = await onboardedStore();
    const now = Date.now();
    const state: ReminderState = {
      day: dayKey(now),
      anchors: { water: now, breaks: now },
      snoozes: { water: null, breaks: null },
      prompts: { water: null, breaks: { at: now, type: 'eyes' } },
      meeting: null,
    };
    await store.session.set('reminders', state);
    open('/', store);
    await screen.findByRole('dialog', { name: 'Rest your eyes' });
    await expectNoViolations();
  });
});
