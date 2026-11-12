import type { ReactNode } from 'react';
import { Card } from './Card';
import { cn } from './cn';
import { TONES, type Tone } from './tones';

/** A titled card of settings lines. The title takes the module colour when there is one. */
export function SettingsGroup({
  title,
  tone,
  children,
}: {
  title: string;
  tone?: Tone;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-1.5">
      <h2
        className={cn(
          'pl-1 font-sans text-[13px] font-semibold tracking-normal',
          tone ? TONES[tone].ink : 'text-ink-2',
        )}
      >
        {title}
      </h2>
      <Card radius="sm" className="flex flex-col divide-y divide-divider">
        {children}
      </Card>
    </section>
  );
}

interface ValueRowProps {
  label: string;
  /** The current value, on the right. */
  value?: string;
  onClick: () => void;
  /** For the one destructive line: "Erase everything". */
  danger?: boolean;
  /** False for a line that acts right away instead of opening an editor. */
  opensDialog?: boolean;
}

/** A settings line: the name on the left, its value on the right. Tapping it opens the editor. */
export function SettingsValueRow({
  label,
  value,
  onClick,
  danger = false,
  opensDialog = true,
}: ValueRowProps) {
  return (
    <button
      type="button"
      aria-haspopup={opensDialog ? 'dialog' : undefined}
      // One name for the two halves of the line: "Daily goal: 2,000 ml".
      aria-label={value ? `${label}: ${value}` : label}
      onClick={onClick}
      className={cn(
        'flex min-h-[50px] w-full items-center justify-between gap-3 px-[18px] py-2 text-left text-[15px]',
        danger ? 'font-semibold text-move-ink' : 'font-medium',
      )}
    >
      <span>{label}</span>
      {value ? <span className="text-right font-normal text-ink-2">{value}</span> : null}
    </button>
  );
}
