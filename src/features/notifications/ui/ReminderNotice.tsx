import { BellOff, Moon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { addDays, dayKey, dayStart } from '@/lib/dates';
import { formatTime, formatWeekdayLong } from '@/lib/format';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { reminderStatus, type ReminderStatus } from '../domain/reminders';
import { useReminders, type RemindersValue } from '../remindersContext';

/**
 * Shown on Today whenever reminders are not running: silenced for a meeting,
 * or outside working hours. It says why, and when they come back.
 */
export function ReminderNotice() {
  const reminders = useReminders();
  if (!reminders) return null;
  const status = reminderStatus(reminders.state, reminders.context);
  if (status.kind === 'meeting') return <Silenced until={status.until} reminders={reminders} />;
  if (status.kind === 'off') return <OffHours status={status} now={reminders.context.now} />;
  return null;
}

function Silenced({ until, reminders }: { until: number | null; reminders: RemindersValue }) {
  const { t, i18n } = useTranslation('reminders');
  return (
    <Card
      as="section"
      variant="soft"
      tone="water"
      className="flex flex-wrap items-center gap-x-4 gap-y-3 px-4 py-3.5"
    >
      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-surface text-water-ink">
        <BellOff aria-hidden="true" size={20} strokeWidth={2} />
      </span>
      <div className="flex min-w-40 flex-1 flex-col">
        <h2 className="text-base font-semibold">{t('silenced.title')}</h2>
        <p className="text-sm text-ink-2">
          {until === null
            ? t('silenced.open')
            : t('silenced.until', { time: formatTime(until, i18n.language) })}
        </p>
      </div>
      <Button variant="outline" tone="water" onClick={() => void reminders.endMeeting()}>
        {t('meeting.back')}
      </Button>
    </Card>
  );
}

function OffHours({
  status,
  now,
}: {
  status: Extract<ReminderStatus, { kind: 'off' }>;
  now: number;
}) {
  const { t, i18n } = useTranslation('reminders');
  const resumes = (resumesAt: number): string => {
    const time = formatTime(resumesAt, i18n.language);
    const today = dayKey(now);
    const day = dayKey(resumesAt);
    if (day === today) return t('off.resumesToday', { time });
    if (day === addDays(today, 1)) return t('off.resumesTomorrow', { time });
    return t('off.resumesWeekday', {
      weekday: formatWeekdayLong(dayStart(day), i18n.language),
      time,
    });
  };

  return (
    <Card as="section" className="flex items-center gap-4 px-4 py-3.5">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-bg text-ink-2">
        <Moon aria-hidden="true" size={20} strokeWidth={2} />
      </span>
      <div className="flex min-w-0 flex-col">
        <h2 className="text-base font-semibold">{t('off.title')}</h2>
        <p className="text-sm text-ink-2">
          {t('off.body')}
          {status.resumesAt === null ? '' : ` ${resumes(status.resumesAt)}`}
        </p>
      </div>
    </Card>
  );
}
