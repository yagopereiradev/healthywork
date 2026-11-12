import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useDataStore, useLive } from '@/data/hooks';
import type { Settings } from '@/data/settings';
import { addDays, dayStart, type DayKey } from '@/lib/dates';
import { formatNumber, formatWeekdayInitial, formatWeekdayLong } from '@/lib/format';
import { Card } from '@/ui/Card';
import { cn } from '@/ui/cn';
import { Skeleton } from '@/ui/StateViews';
import { recentDays, totalsByDay } from '../domain/week';
import { loadGoalStreak } from '../streak';

const DAYS = 7;

interface WeekCardProps {
  today: DayKey;
  settings: Settings;
  /** Today's total, so the streak is recounted when it changes. */
  todayTotalMl: number;
}

/** "Your week": water for the last seven days. Days that reached the goal are in the full colour. */
export function WeekCard({ today, settings, todayTotalMl }: WeekCardProps) {
  const { t, i18n } = useTranslation('today');
  const store = useDataStore();
  const goalMl = settings.water.goalMl;
  const workdays = settings.workday.days;

  const week = useLive(
    () => store.water.watchBetween(addDays(today, -(DAYS - 1)), today),
    [store, today],
  );

  const [streak, setStreak] = useState(0);
  const workdaysKey = workdays.join(',');
  useEffect(() => {
    let current = true;
    void loadGoalStreak(store.water, { today, goalMl, workdays }).then((count) => {
      if (current) setStreak(count);
    });
    return () => {
      current = false;
    };
    // `workdays` is a new array on every settings read; its content is in workdaysKey.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store, today, goalMl, workdaysKey, todayTotalMl]);

  const days =
    week.status === 'ready' ? recentDays(totalsByDay(week.value), today, goalMl, DAYS) : [];
  const tallest = Math.max(goalMl, ...days.map((day) => day.totalMl), 1);

  return (
    <Card as="section" className="flex flex-col gap-3 px-6 py-5 md:rounded-card-lg">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3">
        <h2 className="font-display text-[17px] font-semibold">{t('week.title')}</h2>
        <p className="text-sm text-ink-2">{t('week.streak', { count: streak })}</p>
      </div>

      {week.status !== 'ready' ? (
        <Skeleton className="h-[88px] rounded-lg" />
      ) : (
        <ol className="grid grid-cols-7 gap-2.5">
          {days.map((day) => {
            const date = dayStart(day.day);
            const amount = formatNumber(day.totalMl, i18n.language);
            const weekday = formatWeekdayLong(date, i18n.language);
            return (
              <li key={day.day} className="flex flex-col items-center gap-2">
                <div className="flex h-16 w-full items-end">
                  <div
                    className={cn(
                      'w-full rounded-md transition-[height] duration-700 ease-out',
                      day.reached ? 'bg-water' : 'bg-water-weak',
                    )}
                    // Even an empty day keeps a sliver, so the row of seven stays readable.
                    style={{ height: `${Math.max((day.totalMl / tallest) * 100, 6)}%` }}
                  />
                </div>
                <span aria-hidden="true" className="text-xs text-ink-2">
                  {formatWeekdayInitial(date, i18n.language)}
                </span>
                <span className="sr-only">
                  {t(day.reached ? 'week.dayReached' : 'week.day', { weekday, amount })}
                </span>
              </li>
            );
          })}
        </ol>
      )}
    </Card>
  );
}
