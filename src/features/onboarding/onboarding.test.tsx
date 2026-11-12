import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { DEFAULT_SETTINGS } from '@/data/settings';
import { initI18n } from '@/i18n';
import { newTestStore, renderWithApp } from '@/test/renderWithApp';
import { Onboarding } from './ui/Onboarding';

beforeAll(async () => {
  await initI18n('en');
});

afterEach(() => {
  vi.unstubAllGlobals();
});

/** A browser that would ask the person about notifications, and what they answer. */
function browserAnswers(answer: NotificationPermission) {
  const requestPermission = vi.fn(async () => answer);
  vi.stubGlobal('Notification', { permission: 'default', requestPermission });
  return requestPermission;
}

const next = () => userEvent.click(screen.getByRole('button', { name: 'Continue' }));

describe('Onboarding', () => {
  it('walks through three steps and can go back', async () => {
    browserAnswers('granted');
    renderWithApp(<Onboarding settings={DEFAULT_SETTINGS} />);

    expect(screen.getByRole('progressbar', { name: 'Step 1 of 3' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      'How much water makes sense for you?',
    );
    expect(screen.getByRole('radio', { name: /2,000 ml, suggestion/ })).toBeChecked();
    expect(screen.queryByRole('button', { name: 'Back' })).not.toBeInTheDocument();

    await next();
    expect(await screen.findByRole('progressbar', { name: 'Step 2 of 3' })).toBeInTheDocument();
    expect(await screen.findByText('What are your working hours?')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Back' }));
    expect(await screen.findByText('How much water makes sense for you?')).toBeInTheDocument();
  });

  it('estimates the reminders from what is chosen, not from a fixed number', async () => {
    browserAnswers('granted');
    renderWithApp(<Onboarding settings={DEFAULT_SETTINGS} />);
    await next();

    expect(await screen.findByRole('status')).toHaveTextContent(
      'With 9h of work, you will get about 12 water reminders and 18 break reminders a day.',
    );

    await userEvent.clear(screen.getByLabelText('End'));
    await userEvent.type(screen.getByLabelText('End'), '15:00');
    expect(screen.getByRole('status')).toHaveTextContent(
      'With 6h of work, you will get about 8 water reminders and 12 break reminders a day.',
    );

    for (const day of ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']) {
      await userEvent.click(screen.getByRole('button', { name: day }));
    }
    expect(screen.getByRole('status')).toHaveTextContent(
      'Choose at least one day to get reminders.',
    );
  });

  it('saves the choices and asks for notifications only when the person taps the button', async () => {
    const requestPermission = browserAnswers('granted');
    const store = newTestStore();
    renderWithApp(<Onboarding settings={DEFAULT_SETTINGS} />, { store });

    await userEvent.click(screen.getByRole('radio', { name: /2,500 ml/ }));
    await next();
    await userEvent.click(await screen.findByRole('button', { name: 'Friday' }));
    await next();

    expect(await screen.findByText('Want reminders as notifications?')).toBeInTheDocument();
    expect(screen.getByText('Time for a break')).toBeInTheDocument();
    expect(screen.getByText(/With the app closed, they do not arrive/)).toBeInTheDocument();
    expect(requestPermission).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole('button', { name: 'Turn on notifications' }));

    await waitFor(async () => expect((await store.settings.get()).onboardingDone).toBe(true));
    expect(requestPermission).toHaveBeenCalledOnce();
    const saved = await store.settings.get();
    expect(saved.water.goalMl).toBe(2500);
    expect(saved.workday.days).toEqual([1, 2, 3, 4]);
    expect(saved.notifications.system).toBe(true);
  });

  it('finishes just the same when the person says "Not now"', async () => {
    const requestPermission = browserAnswers('granted');
    const store = newTestStore();
    renderWithApp(<Onboarding settings={DEFAULT_SETTINGS} />, { store });
    await next();
    await next();

    await userEvent.click(await screen.findByRole('button', { name: 'Not now' }));

    await waitFor(async () => expect((await store.settings.get()).onboardingDone).toBe(true));
    expect(requestPermission).not.toHaveBeenCalled();
    expect((await store.settings.get()).notifications.system).toBe(false);
  });

  it('explains and moves on when the browser blocks notifications', async () => {
    browserAnswers('denied');
    const store = newTestStore();
    renderWithApp(<Onboarding settings={DEFAULT_SETTINGS} />, { store });
    await next();
    await next();

    await userEvent.click(await screen.findByRole('button', { name: 'Turn on notifications' }));

    expect(
      await screen.findByText(/Notifications are blocked in this browser/),
    ).toBeInTheDocument();
    expect((await store.settings.get()).onboardingDone).toBe(false);

    await userEvent.click(screen.getByRole('button', { name: 'Get started' }));
    await waitFor(async () => expect((await store.settings.get()).onboardingDone).toBe(true));
    expect((await store.settings.get()).notifications.system).toBe(false);
  });
});
