import { motion } from 'motion/react';
import type { ReactNode } from 'react';
import { cn } from './cn';
import { TONES, type Tone } from './tones';

interface TimelineRowProps {
  /** "15:02" */
  time: string;
  tone: Tone;
  text: string;
  /** Upcoming reminders are quieter: hollow dot, secondary text. */
  upcoming?: boolean;
  /** Slide in from the top when added to a list (inside AnimatePresence). */
  animated?: boolean;
}

/**
 * A line of "Your day": time in Sora, a dot in the module colour, the text.
 * Use inside <TimelineList>, which lines up the three columns across rows.
 */
export function TimelineRow({
  time,
  tone,
  text,
  upcoming = false,
  animated = false,
}: TimelineRowProps) {
  const t = TONES[tone];
  return (
    <motion.li
      layout={animated ? 'position' : false}
      initial={animated ? { opacity: 0, y: -18 } : false}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, transition: { duration: 0.15 } }}
      transition={{ type: 'spring', stiffness: 420, damping: 34 }}
      className={cn(
        'col-span-3 grid grid-cols-subgrid items-center border-divider py-2.5 text-sm not-first:border-t md:py-[11px] md:text-[15px]',
        upcoming ? 'text-ink-2' : 'font-semibold',
      )}
    >
      <time className="font-display font-semibold tabular-nums">{time}</time>
      <span
        aria-hidden="true"
        className={cn('size-2.5 rounded-full', upcoming ? cn('border-2', t.ring) : t.fill)}
      />
      <span className="min-w-0">{text}</span>
    </motion.li>
  );
}

/** The list that holds TimelineRows. The time column takes the width of the widest time. */
export function TimelineList({ children }: { children: ReactNode }) {
  return <ul className="grid grid-cols-[auto_auto_1fr] gap-x-3">{children}</ul>;
}
