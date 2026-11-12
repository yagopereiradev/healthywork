import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { Sheet } from './Sheet';

function Example() {
  const [open, setOpen] = useState(false);
  return (
    <div id="root">
      <button onClick={() => setOpen(true)}>Open</button>
      <button>Behind</button>
      <Sheet open={open} onClose={() => setOpen(false)} labelledBy="sheet-title">
        <h2 id="sheet-title">In a meeting?</h2>
        <button>First</button>
        <button data-autofocus>Second</button>
        <button onClick={() => setOpen(false)}>Last</button>
      </Sheet>
    </div>
  );
}

const closed = () => waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());

describe('Sheet', () => {
  it('opens as a modal dialog named by its title and moves focus inside', async () => {
    render(<Example />);
    await userEvent.click(screen.getByRole('button', { name: 'Open' }));

    const dialog = screen.getByRole('dialog', { name: 'In a meeting?' });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(screen.getByRole('button', { name: 'Second' })).toHaveFocus();
    expect(document.getElementById('root')).toHaveAttribute('inert');
  });

  it('keeps Tab and Shift+Tab inside', async () => {
    render(<Example />);
    await userEvent.click(screen.getByRole('button', { name: 'Open' }));

    await userEvent.tab();
    expect(screen.getByRole('button', { name: 'Last' })).toHaveFocus();
    await userEvent.tab();
    expect(screen.getByRole('button', { name: 'First' })).toHaveFocus();
    await userEvent.tab({ shift: true });
    expect(screen.getByRole('button', { name: 'Last' })).toHaveFocus();
  });

  it('closes on Esc and gives focus back to what opened it', async () => {
    render(<Example />);
    const opener = screen.getByRole('button', { name: 'Open' });
    await userEvent.click(opener);

    await userEvent.keyboard('{Escape}');

    await closed();
    expect(opener).toHaveFocus();
    expect(document.getElementById('root')).not.toHaveAttribute('inert');
  });

  it('closes from a control inside', async () => {
    render(<Example />);
    await userEvent.click(screen.getByRole('button', { name: 'Open' }));

    await userEvent.click(screen.getByRole('button', { name: 'Last' }));

    await closed();
  });
});
