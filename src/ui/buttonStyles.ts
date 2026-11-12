import { cn } from './cn';
import { TONES, type Tone } from './tones';

export type ButtonVariant =
  /** Primary action, in the colour of the module where it happens. */
  | 'solid'
  /** Secondary action. */
  | 'outline'
  /** Tertiary action, text only. */
  | 'ghost'
  /** Primary action on a solid module card. */
  | 'inverse'
  /** Secondary action on a solid module card. */
  | 'inverse-outline';

export type ButtonSize =
  | 'md'
  | 'lg'
  | 'xl'
  /** As tall as xl, for two buttons sharing a narrow row: slightly smaller text, tighter sides. */
  | 'xl-pair'
  /** The fixed action bar on a phone: tall, with tight side padding. */
  | 'bar'
  /** Square companions of lg and bar, for a single icon. */
  | 'lg-icon'
  | 'bar-icon';

// Every size clears the 44px minimum touch target.
const SIZES: Record<ButtonSize, string> = {
  md: 'min-h-11 rounded-control px-3.5 text-sm',
  lg: 'min-h-12 rounded-control-lg px-[18px] text-[15px]',
  xl: 'min-h-[54px] rounded-control-xl px-5 text-base',
  'xl-pair': 'min-h-[54px] rounded-control-xl px-3 text-[15px]',
  bar: 'min-h-[52px] rounded-control-lg px-2.5 text-sm',
  'lg-icon': 'min-h-12 w-11 shrink-0 rounded-control-lg',
  'bar-icon': 'min-h-[52px] w-11 shrink-0 rounded-control-lg',
};

function variantClasses(variant: ButtonVariant, tone: Tone | undefined): string {
  const t = tone ? TONES[tone] : undefined;
  switch (variant) {
    case 'solid':
      return cn(t ? t.accent : 'bg-ink text-bg', 'hover:brightness-95');
    case 'outline':
      // On a tinted card the button is transparent and borrows the card's border colour.
      return t
        ? cn('border bg-transparent text-ink hover:bg-surface/40', t.softLine)
        : 'border border-line bg-surface text-ink hover:border-control';
    case 'ghost':
      return cn('bg-transparent hover:text-ink', t ? t.ink2 : 'text-ink-2');
    case 'inverse':
      return cn('bg-solid-on hover:brightness-95', t?.solidInk ?? 'text-ink');
    case 'inverse-outline':
      return cn(
        'border bg-transparent text-solid-on hover:bg-solid-on/10',
        t?.solidLine ?? 'border-solid-on',
      );
  }
}

/** The look of a button, for <button> and for links that act as one. */
export function buttonClasses({
  variant = 'solid',
  tone,
  size = 'md',
  className,
}: {
  variant?: ButtonVariant;
  tone?: Tone;
  size?: ButtonSize;
  className?: string;
} = {}): string {
  return cn(
    'inline-flex items-center justify-center gap-2 font-sans font-semibold select-none',
    'transition-[transform,filter,background-color,border-color,color] duration-150 ease-out',
    'active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50',
    SIZES[size],
    variantClasses(variant, tone),
    className,
  );
}
