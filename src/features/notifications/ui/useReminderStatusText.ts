import { useTranslation } from 'react-i18next';
import { formatTime } from '@/lib/format';
import { reminderStatus } from '../domain/reminders';
import { useReminders } from '../remindersContext';

/** The status in a few words, for the line under the date: "reminders active until 18:00". */
export function useReminderStatusText(): string | null {
  const { t, i18n } = useTranslation('reminders');
  const reminders = useReminders();
  if (!reminders) return null;

  const status = reminderStatus(reminders.state, reminders.context);
  const time = (timestamp: number) => formatTime(timestamp, i18n.language);
  switch (status.kind) {
    case 'active':
      return t('status.active', { time: time(status.until) });
    case 'meeting':
      return status.until === null
        ? t('status.meetingOpen')
        : t('status.meeting', { time: time(status.until) });
    case 'off':
      return t('status.off');
  }
}
