import { useRef, type KeyboardEvent } from 'react';
import { cn } from './cn';

interface Choice<T extends string> {
  value: T;
  label: string;
  /** Quieter text on the right: what choosing this means ("until 15:48"). */
  detail?: string;
}

interface ChoiceListProps<T extends string> {
  /** Accessible name of the group. */
  label: string;
  choices: readonly Choice<T>[];
  value: T;
  onChange: (value: T) => void;
}

/**
 * One choice among a few, each on its own roomy line. It is a radio group: one
 * tab stop, and the arrow keys move the selection.
 */
export function ChoiceList<T extends string>({
  label,
  choices,
  value,
  onChange,
}: ChoiceListProps<T>) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  const onKeyDown = (event: KeyboardEvent, index: number) => {
    const moves: Record<string, number> = {
      ArrowDown: index + 1,
      ArrowRight: index + 1,
      ArrowUp: index - 1,
      ArrowLeft: index - 1,
      Home: 0,
      End: choices.length - 1,
    };
    const target = moves[event.key];
    if (target === undefined) return;
    event.preventDefault();
    const next = (target + choices.length) % choices.length;
    const choice = choices[next];
    if (!choice) return;
    onChange(choice.value);
    refs.current[next]?.focus();
  };

  return (
    <div role="radiogroup" aria-label={label} className="flex flex-col gap-2">
      {choices.map((choice, index) => {
        const selected = choice.value === value;
        return (
          <button
            key={choice.value}
            ref={(element) => {
              refs.current[index] = element;
            }}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={choice.detail ? `${choice.label}, ${choice.detail}` : choice.label}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(choice.value)}
            onKeyDown={(event) => onKeyDown(event, index)}
            className={cn(
              'flex min-h-14 items-center justify-between gap-3 rounded-2xl px-4 text-left text-base font-semibold transition-colors duration-150',
              // The selected border is 1px thicker; the margin keeps the text from shifting.
              selected
                ? 'border-2 border-water bg-water-soft'
                : 'm-px border border-line bg-surface hover:border-control',
            )}
          >
            {choice.label}
            {choice.detail ? (
              <span
                className={cn('text-sm font-semibold', selected ? 'text-water-ink' : 'text-ink-2')}
              >
                {choice.detail}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
