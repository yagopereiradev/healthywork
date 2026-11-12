import { useTranslation } from 'react-i18next';
import { Button } from '@/ui/Button';
import type { ButtonSize } from '@/ui/buttonStyles';
import { useReminders } from '../remindersContext';
import { useMeetingSheet } from './meetingSheetStore';

/**
 * "In a meeting": opens the sheet that silences reminders. While they are
 * silenced it becomes "I am back", which turns them on again.
 */
export function MeetingButton({ size = 'md' }: { size?: ButtonSize }) {
  const { t } = useTranslation('reminders');
  const reminders = useReminders();
  const showSheet = useMeetingSheet((state) => state.show);
  const inMeeting = Boolean(reminders?.state.meeting);

  return (
    <Button
      variant="outline"
      size={size}
      shortcut="M"
      disabled={!reminders}
      aria-haspopup={inMeeting ? undefined : 'dialog'}
      onClick={() => (inMeeting ? void reminders?.endMeeting() : showSheet())}
    >
      {inMeeting ? t('meeting.back') : t('meeting.button')}
    </Button>
  );
}
