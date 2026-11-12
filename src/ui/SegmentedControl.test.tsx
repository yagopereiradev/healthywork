import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { SegmentedControl } from './SegmentedControl';

type Range = '7' | '30' | '90';

function Example() {
  const [value, setValue] = useState<Range>('7');
  return (
    <SegmentedControl<Range>
      label="Range"
      value={value}
      onChange={setValue}
      options={[
        { value: '7', label: '7 days' },
        { value: '30', label: '30 days' },
        { value: '90', label: '90 days' },
      ]}
    />
  );
}

describe('SegmentedControl', () => {
  it('is a labelled radio group with one option checked', () => {
    render(<Example />);

    expect(screen.getByRole('radiogroup', { name: 'Range' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: '7 days' })).toBeChecked();
    expect(screen.getByRole('radio', { name: '30 days' })).not.toBeChecked();
  });

  it('selects on click', async () => {
    render(<Example />);

    await userEvent.click(screen.getByRole('radio', { name: '30 days' }));

    expect(screen.getByRole('radio', { name: '30 days' })).toBeChecked();
    expect(screen.getByRole('radio', { name: '7 days' })).not.toBeChecked();
  });

  it('is a single tab stop and moves with the arrow keys, wrapping around', async () => {
    render(<Example />);

    await userEvent.tab();
    expect(screen.getByRole('radio', { name: '7 days' })).toHaveFocus();

    await userEvent.keyboard('{ArrowRight}');
    expect(screen.getByRole('radio', { name: '30 days' })).toBeChecked();
    expect(screen.getByRole('radio', { name: '30 days' })).toHaveFocus();

    await userEvent.keyboard('{ArrowLeft}{ArrowLeft}');
    expect(screen.getByRole('radio', { name: '90 days' })).toBeChecked();

    await userEvent.keyboard('{Home}');
    expect(screen.getByRole('radio', { name: '7 days' })).toBeChecked();

    await userEvent.tab();
    expect(document.body).toHaveFocus();
  });
});
