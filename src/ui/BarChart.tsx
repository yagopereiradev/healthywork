import { cn } from './cn';
import type { Tone } from './tones';

const FILL: Record<Tone, { strong: string; weak: string }> = {
  water: { strong: 'bg-water', weak: 'bg-water-weak' },
  move: { strong: 'bg-move', weak: 'bg-move-weak' },
  focus: { strong: 'bg-focus', weak: 'bg-focus-weak' },
};

export interface Bar {
  key: string;
  value: number;
  /** Full colour (the goal was reached, something was done) or the quieter one. */
  strong: boolean;
  /** What a screen reader says for this bar: "Thursday: 1,250 ml". */
  description: string;
  /** Short label under the bar. Leave out to keep a crowded axis clean. */
  axis?: string;
}

interface BarChartProps {
  bars: readonly Bar[];
  tone: Tone;
  /** The value that fills the height. Defaults to the largest bar. */
  max?: number;
  /** Bar area height in pixels. */
  height?: number;
  className?: string;
}

/**
 * A small bar chart in a module colour, one bar per day. The drawing is
 * decoration for a screen reader: each bar also carries its value in words.
 * An empty day keeps a sliver, so the row of days stays readable.
 */
export function BarChart({ bars, tone, max, height = 56, className }: BarChartProps) {
  const top = Math.max(max ?? 0, ...bars.map((bar) => bar.value), 1);
  const crowded = bars.length > 10;
  const hasAxis = bars.some((bar) => bar.axis);

  return (
    <ol
      className={cn('grid items-end', crowded ? 'gap-[3px]' : 'gap-2.5', className)}
      style={{ gridTemplateColumns: `repeat(${bars.length}, minmax(0, 1fr))` }}
    >
      {bars.map((bar) => (
        <li key={bar.key} className="flex min-w-0 flex-col items-center gap-2">
          <div className="flex w-full items-end" style={{ height }}>
            <div
              className={cn(
                'w-full transition-[height] duration-700 ease-out',
                crowded ? 'rounded-[3px]' : 'rounded-md',
                bar.strong ? FILL[tone].strong : FILL[tone].weak,
              )}
              style={{ height: `${Math.max((bar.value / top) * 100, 6)}%` }}
            />
          </div>
          {hasAxis ? (
            <span aria-hidden="true" className="h-4 text-xs leading-4 text-ink-2">
              {bar.axis}
            </span>
          ) : null}
          <span className="sr-only">{bar.description}</span>
        </li>
      ))}
    </ol>
  );
}
