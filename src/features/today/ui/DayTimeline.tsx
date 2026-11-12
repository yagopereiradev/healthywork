import { Sprout } from 'lucide-react';
import { AnimatePresence } from 'motion/react';
import { useTranslation } from 'react-i18next';
import type { UpcomingReminder } from '@/features/notifications/domain/reminders';
import { formatNumber, formatTime } from '@/lib/format';
import { Card } from '@/ui/Card';
import { TimelineList, TimelineRow } from '@/ui/TimelineRow';
import type { Tone } from '@/ui/tones';
import type { TimelineItem } from '../domain/timeline';

const MODULE_TONE: Record<TimelineItem['module'], Tone> = {
  water: 'water',
  breaks: 'move',
  focus: 'focus',
};

interface DayTimelineProps {
  /** What was logged today, most recent first. */
  items: TimelineItem[];
  /** Reminders still to come today, soonest first. */
  upcoming: UpcomingReminder[];
}

/**
 * "Your day": the reminders still to come at the top, quieter, and below them
 * what was logged, most recent first. New records slide in from the top.
 */
export function DayTimeline({ items, upcoming }: DayTimelineProps) {
  const { t, i18n } = useTranslation('today');
  const { t: tw } = useTranslation('water');
  const { t: tb } = useTranslation('breaks');
  const { t: tr } = useTranslation('reminders');
  const time = (timestamp: number) => formatTime(timestamp, i18n.language);

  const describe = (item: TimelineItem): string => {
    switch (item.module) {
      case 'water':
        return t('day.water', {
          drink: tw(`drinks.${item.drink}`),
          amount: formatNumber(item.amountMl, i18n.language),
        });
      case 'breaks':
        // A break logged by hand has no type: the app does not know what was done.
        return item.type ? t('day.break', { type: tb(`types.${item.type}`) }) : t('day.breakPlain');
      case 'focus':
        return t('day.focus', { count: item.minutes });
    }
  };

  // The later reminder goes on top, so time runs downwards like in the records.
  const comingUp = [...upcoming].reverse();

  return (
    <Card as="section" className="flex flex-col px-[18px] py-4 md:rounded-card-lg md:px-6 md:py-5">
      <h2 className="pb-1.5 font-sans text-[13px] font-semibold tracking-normal text-ink-2 md:pb-2 md:font-display md:text-[17px] md:text-ink">
        {t('day.title')}
      </h2>

      {comingUp.length + items.length > 0 ? (
        <TimelineList>
          <AnimatePresence initial={false} mode="popLayout">
            {comingUp.map((reminder) => (
              <TimelineRow
                key={`upcoming-${reminder.kind}`}
                animated
                upcoming
                time={time(reminder.at)}
                tone={reminder.kind === 'water' ? 'water' : 'move'}
                text={
                  reminder.kind === 'water'
                    ? tr('upcoming.water')
                    : tr('upcoming.break', { type: tb(`types.${reminder.type}`) })
                }
              />
            ))}
            {items.map((item) => (
              <TimelineRow
                key={item.id}
                animated
                time={time(item.at)}
                tone={MODULE_TONE[item.module]}
                text={describe(item)}
              />
            ))}
          </AnimatePresence>
        </TimelineList>
      ) : null}

      {items.length === 0 ? (
        <div className="flex flex-col items-center gap-2 px-2 py-6 text-center">
          <span className="flex size-12 items-center justify-center rounded-full bg-water-soft text-water-ink">
            <Sprout aria-hidden="true" size={24} strokeWidth={1.75} />
          </span>
          <p className="font-display text-base font-semibold">{t('day.emptyTitle')}</p>
          <p className="max-w-xs text-sm text-ink-2">{t('day.emptyBody')}</p>
        </div>
      ) : null}
    </Card>
  );
}
