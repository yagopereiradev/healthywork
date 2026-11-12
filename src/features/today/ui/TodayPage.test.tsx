import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { initI18n } from '@/i18n';
import { dayKey } from '@/lib/dates';
import { newTestStore, renderWithApp } from '@/test/renderWithApp';
import { useToasts } from '@/ui/toast/toastStore';
import { TodayPage } from './TodayPage';

beforeAll(async () => {
  await initI18n('en');
});

beforeEach(() => {
  useToasts.setState({ toasts: [] });
});

const waterBar = () => screen.findByRole('progressbar', { name: 'Water' });
const today = () => dayKey(Date.now());

describe('TodayPage', () => {
  it('starts an empty day with the three bars at zero and an invitation to log', async () => {
    renderWithApp(<TodayPage />);

    expect(await waterBar()).toHaveAttribute('aria-valuetext', '0 of 2,000 ml');
    expect(screen.getByRole('progressbar', { name: 'Breaks' })).toHaveAttribute(
      'aria-valuetext',
      '0 of 18',
    );
    expect(screen.getByRole('progressbar', { name: 'Focus' })).toHaveAttribute(
      'aria-valuetext',
      '0 min of 4h',
    );
    expect(screen.getByText('Your day starts here')).toBeInTheDocument();
  });

  it('logs 250 ml in one tap: the bar, the timeline and a toast all show it', async () => {
    const { store } = renderWithApp(<TodayPage />);
    await waterBar();

    await userEvent.click(screen.getByRole('button', { name: /250 ml of water/ }));

    await waitFor(async () =>
      expect(await waterBar()).toHaveAttribute('aria-valuetext', '250 of 2,000 ml'),
    );
    expect(screen.getByText('Water · 250 ml')).toBeInTheDocument();
    expect(screen.queryByText('Your day starts here')).not.toBeInTheDocument();
    expect(
      within(screen.getByRole('region', { name: 'Notices' })).getByText('250 ml logged'),
    ).toBeInTheDocument();
    expect(await store.water.listBetween(today(), today())).toHaveLength(1);
  });

  it('undoes a record from the toast', async () => {
    const { store } = renderWithApp(<TodayPage />);
    await waterBar();
    await userEvent.click(screen.getByRole('button', { name: /250 ml of water/ }));
    await screen.findByText('Water · 250 ml');

    await userEvent.click(screen.getByRole('button', { name: 'Undo' }));

    await waitFor(async () =>
      expect(await waterBar()).toHaveAttribute('aria-valuetext', '0 of 2,000 ml'),
    );
    await waitFor(() => expect(screen.queryByText('Water · 250 ml')).not.toBeInTheDocument());
    expect(await store.water.listBetween(today(), today())).toEqual([]);
  });

  it('logs another amount and another drink through the sheet', async () => {
    const { store } = renderWithApp(<TodayPage />);
    await waterBar();

    await userEvent.click(screen.getByRole('button', { name: 'Another amount or drink' }));
    const sheet = await screen.findByRole('dialog', { name: 'Log a drink' });
    await userEvent.click(within(sheet).getByRole('radio', { name: 'Other' }));
    await userEvent.type(within(sheet).getByLabelText('Amount in ml'), '330');
    await userEvent.click(within(sheet).getByRole('radio', { name: 'Tea' }));
    await userEvent.click(within(sheet).getByRole('button', { name: 'Log 330 ml' }));

    expect(await screen.findByText('Tea · 330 ml')).toBeInTheDocument();
    const [entry] = await store.water.listBetween(today(), today());
    expect(entry).toMatchObject({ amountMl: 330, drink: 'tea' });
  });

  it('refuses an amount that makes no sense and says why', async () => {
    const { store } = renderWithApp(<TodayPage />);
    await waterBar();

    await userEvent.click(screen.getByRole('button', { name: 'Another amount or drink' }));
    const sheet = await screen.findByRole('dialog', { name: 'Log a drink' });
    await userEvent.click(within(sheet).getByRole('radio', { name: 'Other' }));
    await userEvent.type(within(sheet).getByLabelText('Amount in ml'), 'lots');
    await userEvent.click(within(sheet).getByRole('button', { name: 'Log' }));

    expect(within(sheet).getByRole('alert')).toHaveTextContent(
      'Use a number between 1 and 2,000 ml.',
    );
    expect(await store.water.listBetween(today(), today())).toEqual([]);
  });

  it('logs a break taken by hand without claiming to know what it was', async () => {
    const { store } = renderWithApp(<TodayPage />);
    await waterBar();

    await userEvent.click(screen.getByRole('button', { name: /I took a break/ }));

    expect(await screen.findByText('Break')).toBeInTheDocument();
    expect(screen.getByRole('progressbar', { name: 'Breaks' })).toHaveAttribute(
      'aria-valuetext',
      '1 of 18',
    );
    const [entry] = await store.breaks.listBetween(today(), today());
    expect(entry).toMatchObject({ type: null, origin: 'manual', durationSec: 0 });
  });

  it('notices the goal once, on the record that reaches it', async () => {
    const store = newTestStore();
    await store.settings.update({ water: { goalMl: 500 } });
    renderWithApp(<TodayPage />, { store });
    await waterBar();
    const add = screen.getByRole('button', { name: /250 ml of water/ });

    await userEvent.click(add);
    await screen.findByText('250 ml logged');
    expect(screen.queryByText("Today's water goal reached")).not.toBeInTheDocument();

    await userEvent.click(add);
    expect(await screen.findByText("Today's water goal reached")).toBeInTheDocument();
    expect(
      await screen.findByRole('img', { name: "Full glass, today's goal reached" }),
    ).toBeInTheDocument();

    useToasts.setState({ toasts: [] });
    await userEvent.click(add);
    await screen.findByText('250 ml logged');
    expect(screen.queryByText("Today's water goal reached")).not.toBeInTheDocument();
  });

  it('explains the evidence behind a bar, with its limit and its source', async () => {
    renderWithApp(<TodayPage />);
    await waterBar();

    const trigger = screen.getByRole('button', { name: 'Why? Breaks' });
    await userEvent.click(trigger);

    const sheet = await screen.findByRole('dialog', { name: 'Why 5 minutes every 30?' });
    expect(within(sheet).getByText(/11 participants/)).toBeInTheDocument();
    expect(within(sheet).getByRole('link', { name: /Read the original source/ })).toHaveAttribute(
      'href',
      'https://www.cuimc.columbia.edu/node/25711',
    );

    await userEvent.click(within(sheet).getByRole('button', { name: 'Got it' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(trigger).toHaveFocus();
  });
});
