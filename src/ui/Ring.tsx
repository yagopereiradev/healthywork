import type { ReactNode } from 'react';
import { cn } from './cn';
import type { Tone } from './tones';

const STROKES: Record<Tone, string> = {
  water: 'var(--hw-water)',
  move: 'var(--hw-move)',
  focus: 'var(--hw-focus)',
};
const TRACKS: Record<Tone, string> = {
  water: 'var(--hw-water-line)',
  move: 'var(--hw-move-line)',
  focus: 'var(--hw-focus-line)',
};

interface RingProps {
  /** 0 to 1: how much of the ring is drawn. */
  progress: number;
  tone: Tone;
  /** What a screen reader says, e.g. "45 seconds left of 60". */
  label: string;
  /** Diameter and stroke, in the SVG's own units. */
  size?: number;
  stroke?: number;
  /** Fill the inside with the surface colour, like a dial. */
  filled?: boolean;
  /** Draw the track in the surface colour, for a ring that sits on a tinted card. */
  trackOnTint?: boolean;
  /** Drawn in the middle: the time, a caption. */
  children?: ReactNode;
  className?: string;
}

/**
 * A ring that drains or fills smoothly, for countdowns. The arc moves with a
 * one-second linear transition between updates, so it reads as continuous even
 * though the number in the middle changes once a second.
 */
export function Ring({
  progress,
  tone,
  label,
  size = 200,
  stroke = 12,
  filled = false,
  trackOnTint = false,
  children,
  className,
}: RingProps) {
  const radius = (size - stroke) / 2 - 1;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.min(Math.max(progress, 0), 1);

  return (
    <div
      role="img"
      aria-label={label}
      className={cn('relative inline-flex shrink-0 items-center justify-center', className)}
    >
      <svg viewBox={`0 0 ${size} ${size}`} aria-hidden="true" className="h-full w-full -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill={filled ? 'var(--hw-surface)' : 'none'}
          stroke={trackOnTint ? 'var(--hw-surface)' : TRACKS[tone]}
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={STROKES[tone]}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - clamped)}
          className="transition-[stroke-dashoffset] duration-1000 ease-linear"
        />
      </svg>
      <div
        aria-hidden="true"
        className="absolute inset-0 flex flex-col items-center justify-center"
      >
        {children}
      </div>
    </div>
  );
}
