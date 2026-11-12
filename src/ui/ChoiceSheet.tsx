import { useId, useState, type ReactNode } from 'react';
import { Button } from './Button';
import { ChoiceList } from './ChoiceList';
import { Sheet } from './Sheet';
import type { Tone } from './tones';

interface Choice<T extends string> {
  value: T;
  label: string;
  detail?: string;
}

interface ChoiceSheetProps<T extends string> {
  open: boolean;
  onClose: () => void;
  title: string;
  /** One line under the title: what this setting does. */
  body?: string;
  choices: readonly Choice<T>[];
  value: T;
  onSave: (value: T) => void;
  saveLabel: string;
  cancelLabel: string;
  tone?: Tone;
  /** Extra content under the choices, given the current selection. */
  children?: (selected: T) => ReactNode;
  /** Return false to keep the sheet open (the extra content shows why). */
  canSave?: (selected: T) => boolean;
}

/** A sheet for picking one option out of a few, with Cancel and Save. */
export function ChoiceSheet<T extends string>({ open, onClose, ...rest }: ChoiceSheetProps<T>) {
  const titleId = useId();
  return (
    <Sheet open={open} onClose={onClose} labelledBy={titleId}>
      <ChoiceForm titleId={titleId} onClose={onClose} {...rest} />
    </Sheet>
  );
}

function ChoiceForm<T extends string>({
  titleId,
  onClose,
  title,
  body,
  choices,
  value,
  onSave,
  saveLabel,
  cancelLabel,
  tone = 'water',
  children,
  canSave,
}: Omit<ChoiceSheetProps<T>, 'open'> & { titleId: string }) {
  const [selected, setSelected] = useState(value);

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        if (canSave && !canSave(selected)) return;
        onSave(selected);
        onClose();
      }}
    >
      <header className="flex flex-col gap-1">
        <h2 id={titleId} className="text-[22px]">
          {title}
        </h2>
        {body ? <p className="text-[15px] leading-[1.45] text-ink-2">{body}</p> : null}
      </header>

      <ChoiceList label={title} choices={choices} value={selected} onChange={setSelected} />
      {children?.(selected)}

      <div className="grid grid-cols-[1fr_2fr] gap-2">
        <Button variant="ghost" size="xl" onClick={onClose}>
          {cancelLabel}
        </Button>
        <Button type="submit" tone={tone} size="xl">
          {saveLabel}
        </Button>
      </div>
    </form>
  );
}
