import { AnimatePresence, motion } from 'motion/react';
import { useId } from 'react';
import { cn } from '@/ui/cn';

const GLASS = 'M8 6 H88 L78 126 Q77 132 71 132 H25 Q19 132 18 126 Z';
// Two wavelengths wide, so sliding it one wavelength to the left loops seamlessly.
const WAVE = 'M0 0 Q24 -9 48 0 T96 0 T144 0 T192 0 V140 H0 Z';
/** Liquid surface when empty (below the base) and when full (just under the rim). */
const EMPTY_Y = 134;
const FULL_Y = 20;

interface WaterGlassProps {
  /** 0 to 1: how much of the goal is done. */
  ratio: number;
  reached: boolean;
  label: string;
  className?: string;
}

/**
 * The small glass beside the water bar. The water is always gently moving,
 * and the level rises with a slight overshoot, like liquid settling, each time
 * something is logged. With reduced motion the water is still and the level
 * simply changes.
 */
export function WaterGlass({ ratio, reached, label, className }: WaterGlassProps) {
  const clipId = useId();

  const clamped = Math.min(Math.max(ratio, 0), 1);
  const level = EMPTY_Y - (EMPTY_Y - FULL_Y) * clamped;

  return (
    <span className={cn('relative inline-flex shrink-0', className)}>
      <svg viewBox="0 0 96 136" role="img" aria-label={label} className="h-full w-full">
        <clipPath id={clipId}>
          <path d={GLASS} />
        </clipPath>
        <path d={GLASS} fill="var(--hw-water-soft)" />
        <g clipPath={`url(#${clipId})`}>
          <motion.g
            initial={false}
            animate={{ y: level }}
            transition={{ type: 'spring', stiffness: 70, damping: 11, mass: 0.9 }}
          >
            {/* The wave slides one wavelength in a loop: see .hw-wave in styles/index.css. */}
            <path d={WAVE} fill="var(--hw-water)" className="hw-wave" />
          </motion.g>
        </g>
        <path
          d={GLASS}
          fill="none"
          stroke="var(--hw-ink)"
          strokeWidth="1.5"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
      </svg>

      <AnimatePresence initial={false}>
        {reached ? (
          <motion.span
            aria-hidden="true"
            className="absolute -top-1.5 -right-1.5 flex size-4 items-center justify-center rounded-full bg-water text-water-on ring-2 ring-surface"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 520, damping: 18 }}
          >
            <svg viewBox="0 0 16 16" className="size-2.5">
              <path
                d="M3.5 8.5 l3 3 l6 -7"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </motion.span>
        ) : null}
      </AnimatePresence>
    </span>
  );
}
