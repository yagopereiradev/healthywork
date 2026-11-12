import { useRef, type KeyboardEvent } from 'react';
import { cn } from './cn';

interface Option<T extends string> {
  value: T;
  label: string;
}

interface SegmentedControlProps<T extends string> {
  /** Accessible name of the group. */
  label: string;
  options: readonly Option<T>[];
  value: T;
  onChange: (value: T) => void;
  /** Background the control sits on, so the track contrasts with it. */
  on?: 'bg' | 'surface';
  /** Tailwind grid-cols classes. Defaults to one column per option. */
  columns?: string;
  className?: string;
}

/**
 * A single choice among a few options, shown side by side.
 * It is a radio group: one tab stop, arrow keys move the selection.
 */
export function SegmentedControl<T extends string>({
  label,
  options,
  value,
  onChange,
  on = 'bg',
  columns,
  className,
}: SegmentedControlProps<T>) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  const select = (index: number) => {
    const option = options[(index + options.length) % options.length];
    if (!option) return;
    onChange(option.value);
    refs.current[options.indexOf(option)]?.focus();
  };

  const onKeyDown = (event: KeyboardEvent, index: number) => {
    const moves: Record<string, number> = {
      ArrowRight: index + 1,
      ArrowDown: index + 1,
      ArrowLeft: index - 1,
      ArrowUp: index - 1,
      Home: 0,
      End: options.length - 1,
    };
    const target = moves[event.key];
    if (target === undefined) return;
    event.preventDefault();
    select(target);
  };

  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cn(
        'grid gap-1 rounded-control-lg p-1',
        on === 'bg' ? 'bg-surface' : 'bg-bg',
        columns,
        className,
      )}
      style={
        columns ? undefined : { gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }
      }
    >
      {options.map((option, index) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            ref={(element) => {
              refs.current[index] = element;
            }}
            type="button"
            role="radio"
            aria-checked={selected}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(option.value)}
            onKeyDown={(event) => onKeyDown(event, index)}
            className={cn(
              'min-h-11 rounded-[0.625rem] px-3.5 text-sm font-semibold transition-colors duration-150',
              selected ? 'bg-ink text-bg' : 'text-ink-2 hover:text-ink',
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
