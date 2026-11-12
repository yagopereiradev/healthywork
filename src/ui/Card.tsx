import type { ElementType, HTMLAttributes, ReactNode } from 'react';
import { cn } from './cn';
import { TONES, type Tone } from './tones';

interface CardProps extends HTMLAttributes<HTMLElement> {
  /**
   * surface: the default white card on the page background.
   * soft: tinted with a module colour ("Up next", notices).
   * solid: filled with a module colour (the "Now" card).
   */
  variant?: 'surface' | 'soft' | 'solid';
  tone?: Tone;
  /** Corner radius: notice 16px, sm 18px, md 22px, lg 24px, xl 28px. */
  radius?: keyof typeof RADIUS;
  as?: ElementType;
  children: ReactNode;
}

const RADIUS = {
  notice: 'rounded-2xl',
  sm: 'rounded-card-sm',
  md: 'rounded-card',
  lg: 'rounded-card-lg',
  xl: 'rounded-sheet',
} as const;

export function Card({
  variant = 'surface',
  tone = 'water',
  radius = 'md',
  as: Tag = 'div',
  className,
  children,
  ...rest
}: CardProps) {
  const t = TONES[tone];
  return (
    <Tag
      className={cn(
        RADIUS[radius],
        variant === 'surface' && 'bg-surface',
        variant === 'soft' && t.soft,
        // .on-solid turns the focus ring light for everything inside.
        variant === 'solid' && cn(t.solid, 'on-solid'),
        className,
      )}
      {...rest}
    >
      {children}
    </Tag>
  );
}
