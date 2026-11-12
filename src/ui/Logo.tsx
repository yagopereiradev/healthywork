import { cn } from './cn';

/**
 * The mark: a white drop with a check inside a rounded square in the water
 * colour. The same geometry generates the favicon and the PWA icons
 * (scripts/generate-icons.mjs).
 */
export function LogoMark({ size = 36, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      aria-hidden="true"
      className={cn('shrink-0', className)}
    >
      <rect width="64" height="64" rx="18" fill="var(--hw-brand)" />
      <path d="M32 11 C32 11 17 27 17 38 a15 15 0 0 0 30 0 C47 27 32 11 32 11Z" fill="#fff" />
      <path
        d="M24 39 l6 6 l11 -12"
        fill="none"
        stroke="var(--hw-brand)"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** "healthywork" in Sora 700, with "work" in the water colour. */
export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn('font-display font-bold tracking-tight', className)}>
      healthy<span className="text-water-ink">work</span>
    </span>
  );
}

export function Logo({ size = 36, className }: { size?: number; className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <LogoMark size={size} />
      <Wordmark />
    </span>
  );
}
