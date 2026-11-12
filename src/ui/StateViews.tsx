import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { Button } from './Button';
import { Card } from './Card';
import { cn } from './cn';
import { TONES, type Tone } from './tones';

/** A designed empty state: icon in the module's soft colour, a title, one line, an optional action. */
export function EmptyState({
  icon: Icon,
  title,
  body,
  tone = 'water',
  action,
}: {
  icon: LucideIcon;
  title: string;
  body: string;
  tone?: Tone;
  action?: ReactNode;
}) {
  const t = TONES[tone];
  return (
    <Card className="flex flex-col items-center gap-3 px-6 py-10 text-center">
      <span className={cn('flex size-14 items-center justify-center rounded-full', t.soft, t.ink)}>
        <Icon aria-hidden="true" size={26} strokeWidth={1.75} />
      </span>
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="max-w-sm text-[15px] text-ink-2">{body}</p>
      {action}
    </Card>
  );
}

/**
 * Loading placeholder with the shape of the content that is on its way.
 * The caller gives it its size and its rounding.
 */
export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden="true" className={cn('animate-pulse bg-divider', className)} />;
}

export function SkeletonGroup({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div role="status" aria-label={label} aria-busy="true">
      {children}
    </div>
  );
}

/** Something failed, and here is what to do about it. */
export function ErrorState({
  title,
  body,
  retryLabel,
  onRetry,
}: {
  title: string;
  body: string;
  retryLabel: string;
  onRetry: () => void;
}) {
  return (
    <Card role="alert" className="flex flex-col items-start gap-3 p-5">
      <div className="flex flex-col gap-1">
        <h2 className="text-base font-semibold">{title}</h2>
        <p className="text-[15px] text-ink-2">{body}</p>
      </div>
      <Button variant="outline" onClick={onRetry}>
        {retryLabel}
      </Button>
    </Card>
  );
}
