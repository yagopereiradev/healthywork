import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { useShortcuts } from './shortcuts';

function Example({ onWater, onHelp }: { onWater: () => void; onHelp: () => void }) {
  useShortcuts({ w: onWater, '?': onHelp });
  return (
    <>
      <label>
        Notes
        <input />
      </label>
      <label>
        Remember
        <input type="checkbox" />
      </label>
      <button>Plain button</button>
    </>
  );
}

function setup() {
  const onWater = vi.fn();
  const onHelp = vi.fn();
  render(<Example onWater={onWater} onHelp={onHelp} />);
  return { onWater, onHelp };
}

describe('useShortcuts', () => {
  it('fires on the key, in either case', async () => {
    const { onWater } = setup();
    await userEvent.keyboard('w');
    await userEvent.keyboard('W');
    expect(onWater).toHaveBeenCalledTimes(2);
  });

  it('fires "?" (Shift + /)', async () => {
    const { onHelp } = setup();
    await userEvent.keyboard('?');
    expect(onHelp).toHaveBeenCalledOnce();
  });

  it('stays quiet while typing in a text field', async () => {
    const { onWater } = setup();
    await userEvent.type(screen.getByLabelText('Notes'), 'two words with w');
    expect(onWater).not.toHaveBeenCalled();
    expect(screen.getByLabelText('Notes')).toHaveValue('two words with w');
  });

  it('still works with focus on a button or a checkbox', async () => {
    const { onWater } = setup();
    screen.getByRole('button', { name: 'Plain button' }).focus();
    await userEvent.keyboard('w');
    screen.getByLabelText('Remember').focus();
    await userEvent.keyboard('w');
    expect(onWater).toHaveBeenCalledTimes(2);
  });

  it('ignores the key when combined with Ctrl, Cmd or Alt', async () => {
    const { onWater } = setup();
    await userEvent.keyboard('{Control>}w{/Control}');
    await userEvent.keyboard('{Meta>}w{/Meta}');
    await userEvent.keyboard('{Alt>}w{/Alt}');
    expect(onWater).not.toHaveBeenCalled();
  });

  it('ignores the key while a sheet is open', async () => {
    const { onWater } = setup();
    const dialog = document.createElement('div');
    dialog.setAttribute('aria-modal', 'true');
    document.body.append(dialog);

    await userEvent.keyboard('w');

    expect(onWater).not.toHaveBeenCalled();
    dialog.remove();
  });
});
