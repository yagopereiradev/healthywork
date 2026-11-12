import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { DataStoreProvider } from '@/data/DataStoreProvider';
import { initI18n } from '@/i18n';
import { newTestStore } from '@/test/renderWithApp';
import { AppShell } from './AppShell';
import { usePwaStore } from './pwaStore';

beforeAll(async () => {
  await initI18n('en');
});

beforeEach(() => {
  usePwaStore.setState({ installPrompt: null, updateReady: false });
});

function renderShell(initialPath = '/') {
  return render(
    <DataStoreProvider store={newTestStore()}>
      <MemoryRouter initialEntries={[initialPath]}>
        <Routes>
          <Route element={<AppShell />}>
            <Route index element={<h1>Today page</h1>} />
            <Route path="focus" element={<h1>Focus page</h1>} />
            <Route path="history" element={<h1>History page</h1>} />
            <Route path="settings" element={<h1>Settings page</h1>} />
          </Route>
        </Routes>
      </MemoryRouter>
    </DataStoreProvider>,
  );
}

describe('AppShell', () => {
  it('offers the four sections in one labelled navigation', () => {
    renderShell();

    const nav = screen.getByRole('navigation', { name: 'Main' });
    const links = within(nav)
      .getAllByRole('link')
      .map((link) => link.getAttribute('aria-label') ?? link.textContent);
    expect(links).toEqual(['HealthyWork', 'Today', 'Focus', 'History', 'Settings']);
  });

  it('marks only the current section', () => {
    renderShell('/history');

    expect(screen.getByRole('link', { name: 'History' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Today' })).not.toHaveAttribute('aria-current');
  });

  it('navigates between sections', async () => {
    renderShell();

    await userEvent.click(screen.getByRole('link', { name: 'Focus' }));

    expect(screen.getByRole('heading', { name: 'Focus page' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Focus' })).toHaveAttribute('aria-current', 'page');
  });

  it('has a skip link to the main content as the first focusable element', async () => {
    renderShell();

    await userEvent.tab();

    const skip = screen.getByRole('link', { name: 'Skip to content' });
    expect(skip).toHaveFocus();
    expect(skip).toHaveAttribute('href', '#main');
    expect(screen.getByRole('main')).toHaveAttribute('id', 'main');
  });

  it('only invites to install while the browser offers it', async () => {
    renderShell();
    expect(screen.queryByRole('button', { name: 'Install app' })).not.toBeInTheDocument();

    let prompted = false;
    const prompt = Object.assign(new Event('beforeinstallprompt'), {
      prompt: async () => {
        prompted = true;
      },
      userChoice: Promise.resolve({ outcome: 'accepted' as const }),
    });
    usePwaStore.setState({ installPrompt: prompt });

    await userEvent.click(await screen.findByRole('button', { name: 'Install app' }));

    expect(prompted).toBe(true);
    expect(screen.queryByRole('button', { name: 'Install app' })).not.toBeInTheDocument();
  });

  it('announces a waiting update and applies it on request', async () => {
    let applied = false;
    renderShell();

    usePwaStore.setState({
      updateReady: true,
      applyUpdate: () => {
        applied = true;
      },
    });

    expect(await screen.findByRole('status')).toHaveTextContent(
      'A new version of HealthyWork is available.',
    );
    await userEvent.click(screen.getByRole('button', { name: 'Update' }));
    expect(applied).toBe(true);
  });
});
