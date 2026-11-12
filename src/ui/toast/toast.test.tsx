import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Toaster } from './Toaster';
import { MAX_TOASTS, showToast, useToasts } from './toastStore';

beforeEach(() => {
  useToasts.setState({ toasts: [] });
});

afterEach(() => {
  vi.useRealTimers();
});

describe('toasts', () => {
  it('announces each toast in a live region that is always on the page', () => {
    render(<Toaster label="Notices" />);
    const region = screen.getByRole('region', { name: 'Notices' });
    expect(region).toHaveAttribute('aria-live', 'polite');

    act(() => void showToast({ message: '250 ml logged' }));

    expect(region).toHaveTextContent('250 ml logged');
  });

  it('runs the action and leaves', async () => {
    render(<Toaster label="Notices" />);
    const undo = vi.fn();
    act(() => void showToast({ message: '250 ml logged', action: { label: 'Undo', run: undo } }));

    await userEvent.click(screen.getByRole('button', { name: 'Undo' }));

    expect(undo).toHaveBeenCalledOnce();
    await waitFor(() => expect(screen.queryByText('250 ml logged')).not.toBeInTheDocument());
  });

  it('stacks, keeping only the most recent ones', () => {
    render(<Toaster label="Notices" />);

    act(() => {
      for (let n = 1; n <= MAX_TOASTS + 2; n++) showToast({ message: `Notice ${n}` });
    });

    expect(useToasts.getState().toasts.map((toast) => toast.message)).toEqual([
      'Notice 3',
      'Notice 4',
      'Notice 5',
    ]);
  });

  it('goes away on its own, and gives more time when there is an action', () => {
    vi.useFakeTimers();
    render(<Toaster label="Notices" />);
    act(() => {
      showToast({ message: 'Short' });
      showToast({ message: 'With undo', action: { label: 'Undo', run: () => {} } });
    });

    act(() => void vi.advanceTimersByTime(4100));
    expect(useToasts.getState().toasts.map((toast) => toast.message)).toEqual(['With undo']);

    act(() => void vi.advanceTimersByTime(3000));
    expect(useToasts.getState().toasts).toEqual([]);
  });
});
