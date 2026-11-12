import { cn } from './cn';

/** 0 = Sunday … 6 = Saturday, as in Date#getDay. Shown starting on Monday. */
const ORDER = [1, 2, 3, 4, 5, 6, 0] as const;
type Day = (typeof ORDER)[number];

// 4 January 2026 is a Sunday, so day n of the week is 4 + n January.
const dateOf = (day: Day) => new Date(2026, 0, 4 + day);

interface WeekdayPickerProps {
  /** Accessible name of the group. */
  label: string;
  value: readonly Day[];
  onChange: (days: Day[]) => void;
  locale: string;
}

/** Seven toggles, Monday to Sunday: the days that count as working days. */
export function WeekdayPicker({ label, value, onChange, locale }: WeekdayPickerProps) {
  const initial = new Intl.DateTimeFormat(locale, { weekday: 'narrow' });
  const full = new Intl.DateTimeFormat(locale, { weekday: 'long' });

  return (
    <div role="group" aria-label={label} className="grid grid-cols-7 gap-1.5">
      {ORDER.map((day) => {
        const on = value.includes(day);
        return (
          <button
            key={day}
            type="button"
            aria-pressed={on}
            aria-label={full.format(dateOf(day))}
            onClick={() =>
              onChange(on ? value.filter((d) => d !== day) : [...value, day].sort((a, b) => a - b))
            }
            className={cn(
              'min-h-11 rounded-control text-sm font-semibold uppercase transition-colors duration-150',
              on ? 'bg-water text-water-on' : 'border border-line bg-surface text-ink-2',
            )}
          >
            {initial.format(dateOf(day))}
          </button>
        );
      })}
    </div>
  );
}
