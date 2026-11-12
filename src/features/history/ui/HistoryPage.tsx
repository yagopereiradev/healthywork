import { CalendarDays } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useDataStore, useLive, useSettings } from '@/data/hooks';
import { ShareSheet } from '@/features/share/ui/ShareSheet';
import { loadGoalStreak } from '@/features/today/streak';
import { useFormatDuration } from '@/i18n/useFormatDuration';
import { addDays, dayKey, dayStart, formatPeriod } from '@/lib/dates';
import {
  formatDayMonth,
  formatLiters,
  formatNumber,
  formatWeekdayInitial,
  formatWeekdayLong,
} from '@/lib/format';
import { useNow } from '@/lib/useNow';
import { BarChart, type Bar } from '@/ui/BarChart';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { cn } from '@/ui/cn';
import { PageHeader } from '@/ui/PageHeader';
import { SegmentedControl } from '@/ui/SegmentedControl';
import { EmptyState, ErrorState, Skeleton, SkeletonGroup } from '@/ui/StateViews';
import { TONES, type Tone } from '@/ui/tones';
import { summarizeHistory, type DayStat, type RangeDays } from '../domain/history';

type RangeChoice = '7' | '30';

export function HistoryPage() {
  const { t, i18n } = useTranslation('history');
  const { t: tc } = useTranslation();
  const { t: ts } = useTranslation('share');
  const [sharing, setSharing] = useState(false);
  const store = useDataStore();
  const formatDuration = useFormatDuration();
  const [choice, setChoice] = useState<RangeChoice>('7');
  const range = Number(choice) as RangeDays;

  const today = dayKey(useNow());
  const from = addDays(today, -(range - 1));
  const settings = useSettings();
  const water = useLive(() => store.water.watchBetween(from, today), [store, from, today]);
  const breaks = useLive(() => store.breaks.watchBetween(from, today), [store, from, today]);
  const focus = useLive(() => store.focus.watchBetween(from, today), [store, from, today]);

  const parts = [settings, water, breaks, focus];
  const failed = parts.some((part) => part.status === 'error');
  const ready =
    settings.status === 'ready' &&
    water.status === 'ready' &&
    breaks.status === 'ready' &&
    focus.status === 'ready';

  const goalMl = settings.value?.water.goalMl ?? 0;
  const workdays = settings.value?.workday.days;
  const workdaysKey = workdays?.join(',');
  const waterCount = water.value?.length ?? 0;
  const [streak, setStreak] = useState(0);
  useEffect(() => {
    if (!workdays) return;
    let current = true;
    void loadGoalStreak(store.water, { today, goalMl, workdays }).then((count) => {
      if (current) setStreak(count);
    });
    return () => {
      current = false;
    };
    // `workdays` is a new array on every settings read; its content is in workdaysKey.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store, today, goalMl, workdaysKey, waterCount]);

  const header = (
    <PageHeader
      title={tc('nav.history')}
      actions={
        <SegmentedControl<RangeChoice>
          label={t('range.label')}
          value={choice}
          onChange={setChoice}
          options={[
            { value: '7', label: t('range.7') },
            { value: '30', label: t('range.30') },
          ]}
        />
      }
    />
  );

  if (failed) {
    return (
      <>
        {header}
        <ErrorState
          title={tc('state.errorTitle')}
          body={tc('state.errorBody')}
          retryLabel={tc('state.retry')}
          onRetry={() => parts.forEach((part) => part.retry())}
        />
      </>
    );
  }

  if (!ready) {
    return (
      <>
        {header}
        <SkeletonGroup label={tc('state.loading')}>
          <div className="grid gap-3 lg:grid-cols-3 lg:gap-6">
            {[0, 1, 2].map((card) => (
              <Skeleton key={card} className="h-[140px] rounded-card" />
            ))}
          </div>
        </SkeletonGroup>
      </>
    );
  }

  const summary = summarizeHistory(
    today,
    range,
    { water: water.value, breaks: breaks.value, focus: focus.value },
    goalMl,
  );
  const number = (value: number) => formatNumber(value, i18n.language);

  // A week shows the weekday under each bar. A month would be a wall of letters.
  const describeDay = (day: DayStat) => {
    const date = dayStart(day.day);
    return {
      date:
        range === 7 ? formatWeekdayLong(date, i18n.language) : formatDayMonth(date, i18n.language),
      axis: range === 7 ? formatWeekdayInitial(date, i18n.language) : undefined,
    };
  };
  const bars = (
    value: (day: DayStat) => number,
    strong: (day: DayStat) => boolean,
    describe: (day: DayStat, date: string) => string,
  ): Bar[] =>
    summary.days.map((day) => {
      const { date, axis } = describeDay(day);
      return {
        key: day.day,
        value: value(day),
        strong: strong(day),
        axis,
        description: describe(day, date),
      };
    });

  return (
    <>
      {header}

      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 text-sm text-ink-2">
        <span>{formatPeriod(from, today, i18n.language)}</span>
        <span className="font-semibold text-ink">{t('streak', { count: streak })}</span>
      </div>

      {summary.empty ? (
        <EmptyState icon={CalendarDays} title={t('emptyTitle')} body={t('emptyBody')} />
      ) : (
        <div className="hw-stagger grid gap-3 lg:grid-cols-3 lg:gap-6">
          <ModuleCard
            tone="water"
            name={tc('modules.water')}
            total={t('liters', { amount: formatLiters(summary.waterMl, i18n.language) })}
          >
            <BarChart
              tone="water"
              max={goalMl}
              bars={bars(
                (day) => day.waterMl,
                (day) => day.goalReached,
                (day, date) =>
                  t(day.goalReached ? 'day.waterReached' : 'day.water', {
                    date,
                    amount: number(day.waterMl),
                  }),
              )}
            />
          </ModuleCard>

          <ModuleCard
            tone="move"
            name={tc('modules.breaks')}
            total={t('breaks', { count: summary.breaks })}
          >
            <BarChart
              tone="move"
              bars={bars(
                (day) => day.breaks,
                (day) => day.breaks > 0,
                (day, date) => t('day.breaks', { date, count: day.breaks }),
              )}
            />
          </ModuleCard>

          <ModuleCard
            tone="focus"
            name={tc('modules.focus')}
            total={formatDuration(summary.focusMin)}
          >
            <BarChart
              tone="focus"
              bars={bars(
                (day) => day.focusMin,
                (day) => day.focusMin > 0,
                (day, date) => t('day.focus', { date, time: formatDuration(day.focusMin) }),
              )}
            />
          </ModuleCard>
        </div>
      )}

      <Button
        tone="water"
        size="lg"
        aria-haspopup="dialog"
        onClick={() => setSharing(true)}
        className="md:self-start"
      >
        {ts('open')}
      </Button>
      <ShareSheet open={sharing} onClose={() => setSharing(false)} />
    </>
  );
}

function ModuleCard({
  tone,
  name,
  total,
  children,
}: {
  tone: Tone;
  name: string;
  total: string;
  children: ReactNode;
}) {
  return (
    <Card as="section" className="flex min-w-0 flex-col gap-2.5 px-[18px] py-3.5 md:p-6">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className={cn('font-sans text-sm font-semibold tracking-normal', TONES[tone].ink)}>
          {name}
        </h2>
        <p className="font-display text-xl font-bold tabular-nums">{total}</p>
      </div>
      {children}
    </Card>
  );
}
