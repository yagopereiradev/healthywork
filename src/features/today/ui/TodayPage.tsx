import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { NextBreakCard } from '@/features/breaks/ui/NextBreakCard';
import { useLogBreak } from '@/features/breaks/useLogBreak';
import type { EvidenceTopic } from '@/features/evidence/domain/sources';
import { WhySheet } from '@/features/evidence/ui/WhySheet';
import { upcomingReminders } from '@/features/notifications/domain/reminders';
import { useReminders } from '@/features/notifications/remindersContext';
import { MeetingButton } from '@/features/notifications/ui/MeetingButton';
import { ReminderNotice } from '@/features/notifications/ui/ReminderNotice';
import { useReminderStatusText } from '@/features/notifications/ui/useReminderStatusText';
import { totalMl } from '@/features/water/domain/water';
import { LogDrinkSheet } from '@/features/water/ui/LogDrinkSheet';
import { useLogWater } from '@/features/water/useLogWater';
import { dayKey, formatLongDate } from '@/lib/dates';
import { DESKTOP_QUERY, useMediaQuery } from '@/lib/useMediaQuery';
import { useNow } from '@/lib/useNow';
import { Card } from '@/ui/Card';
import { PageHeader } from '@/ui/PageHeader';
import { ErrorState, Skeleton, SkeletonGroup } from '@/ui/StateViews';
import { buildTimeline } from '../domain/timeline';
import { useToday } from '../useToday';
import { DayTimeline } from './DayTimeline';
import { NowCard } from './NowCard';
import { ProgressCard } from './ProgressCard';
import { QuickActions } from './QuickActions';
import { WeekCard } from './WeekCard';

export function TodayPage() {
  const { t, i18n } = useTranslation();
  const now = useNow();
  const today = dayKey(now);
  const state = useToday(today);
  const reminders = useReminders();
  const reminderStatus = useReminderStatusText();
  const desktop = useMediaQuery(DESKTOP_QUERY);
  const logWater = useLogWater();
  const logBreak = useLogBreak();
  const [why, setWhy] = useState<EvidenceTopic | null>(null);
  const [loggingDrink, setLoggingDrink] = useState(false);
  const navigate = useNavigate();

  const date = formatLongDate(now, i18n.language);
  const actions = (
    <QuickActions
      layout={desktop ? 'desktop' : 'phone'}
      onAddWater={() => void logWater()}
      onMoreWater={() => setLoggingDrink(true)}
      onTookBreak={() => void logBreak()}
    />
  );

  return (
    <>
      <PageHeader
        // On a computer the reminder status sits beside the date. On a phone the
        // notice below says it when there is something to say.
        eyebrow={desktop && reminderStatus ? `${date} · ${reminderStatus}` : date}
        title={t('nav.today')}
        actions={
          desktop ? (
            <>
              {actions}
              <MeetingButton size="lg" />
            </>
          ) : (
            <MeetingButton />
          )
        }
      />

      <ReminderNotice />

      {state.status === 'loading' ? <TodaySkeleton label={t('state.loading')} /> : null}

      {state.status === 'error' ? (
        <ErrorState
          title={t('state.errorTitle')}
          body={t('state.errorBody')}
          retryLabel={t('state.retry')}
          onRetry={state.retry}
        />
      ) : null}

      {state.status === 'ready' ? (
        // Two columns that stack on their own when the window gets narrow.
        <div className="flex flex-wrap items-start gap-3.5 md:gap-6">
          <div className="hw-stagger flex min-w-0 flex-[2_1_440px] flex-col gap-3.5 md:gap-6">
            <ProgressCard data={state.data} onWhy={setWhy} />
            <div className="flex flex-wrap gap-3.5 md:gap-6">
              <NowCard roomy={desktop} />
              {desktop ? <NextBreakCard /> : null}
            </div>
          </div>
          <div className="hw-stagger flex min-w-0 flex-[1_1_300px] flex-col gap-3.5 md:gap-6">
            <DayTimeline
              items={buildTimeline(state.data.water, state.data.breaks, state.data.focus)}
              upcoming={reminders ? upcomingReminders(reminders.state, reminders.context) : []}
            />
            {desktop ? (
              <WeekCard
                today={today}
                settings={state.data.settings}
                todayTotalMl={totalMl(state.data.water)}
              />
            ) : null}
          </div>
        </div>
      ) : null}

      {desktop ? null : (
        <>
          {actions}
          {/* Keeps the end of the page clear of the fixed actions. */}
          <div aria-hidden="true" className="h-14" />
        </>
      )}

      <WhySheet
        topic={why}
        onClose={() => setWhy(null)}
        onChange={() => void navigate('/settings')}
      />
      <LogDrinkSheet
        open={loggingDrink}
        onClose={() => setLoggingDrink(false)}
        onLog={(amountMl, drink) => void logWater(amountMl, drink)}
      />
    </>
  );
}

function TodaySkeleton({ label }: { label: string }) {
  return (
    <SkeletonGroup label={label}>
      <div className="flex flex-col gap-3.5 md:gap-6">
        <Card className="flex flex-col gap-4 px-[18px] py-4 md:px-7 md:py-6">
          {[0, 1, 2].map((row) => (
            <div key={row} className="flex flex-col gap-2">
              <Skeleton className="h-4 w-28 rounded-md" />
              <Skeleton className="h-2 w-full rounded-full md:h-3" />
            </div>
          ))}
        </Card>
        <Skeleton className="h-24 rounded-card" />
        <Skeleton className="h-48 rounded-card" />
      </div>
    </SkeletonGroup>
  );
}
