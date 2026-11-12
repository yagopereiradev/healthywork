import { cn } from './cn';
import { TONES, type Tone } from './tones';

interface ProgressBarProps {
  value: number;
  max: number;
  tone: Tone;
  /** Accessible name, e.g. "Water". */
  label: string;
  /** What a screen reader says for the value, e.g. "1,250 of 2,000 ml". */
  valueText?: string;
  size?: 'sm' | 'md';
  /** Drawn on a solid module card: white fill over the deep track. */
  onSolid?: boolean;
  className?: string;
}

/** Rounded bar in the module colour over its soft colour. Grows smoothly. */
export function ProgressBar({
  value,
  max,
  tone,
  label,
  valueText,
  size = 'sm',
  onSolid = false,
  className,
}: ProgressBarProps) {
  const t = TONES[tone];
  const ratio = max > 0 ? Math.min(Math.max(value / max, 0), 1) : 0;

  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={Math.min(Math.max(value, 0), max)}
      aria-valuetext={valueText}
      className={cn(
        'overflow-hidden rounded-full',
        size === 'sm' ? 'h-2' : 'h-3',
        onSolid ? t.solidDeep : t.soft,
        className,
      )}
    >
      <div
        className={cn(
          'h-full rounded-full transition-[width] duration-700 ease-out',
          onSolid ? 'bg-solid-on' : t.fill,
        )}
        style={{ width: `${ratio * 100}%` }}
      />
    </div>
  );
}
