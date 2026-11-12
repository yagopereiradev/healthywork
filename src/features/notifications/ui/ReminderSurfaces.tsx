import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { BreakScreen } from '@/features/breaks/ui/BreakScreen';
import type { EvidenceTopic } from '@/features/evidence/domain/sources';
import { WhySheet } from '@/features/evidence/ui/WhySheet';
import { systemClock } from '@/lib/clock';
import { formatTime } from '@/lib/format';
import { useToasts } from '@/ui/toast/toastStore';
import { useReminders } from '../remindersContext';
import { MeetingSheet } from './MeetingSheet';
import { useMeetingSheet } from './meetingSheetStore';

/**
 * The reminder surfaces that sit above every screen: the break screen, the
 * "Why?" it can open, and the "In a meeting?" sheet.
 */
export function ReminderSurfaces() {
  const { t, i18n } = useTranslation('reminders');
  const reminders = useReminders();
  const show = useToasts((state) => state.show);
  const meetingOpen = useMeetingSheet((state) => state.open);
  const hideMeeting = useMeetingSheet((state) => state.hide);
  const [why, setWhy] = useState<EvidenceTopic | null>(null);

  return (
    <>
      <BreakScreen
        prompt={reminders?.state.prompts.breaks ?? null}
        breakDurationMin={reminders?.settings.breaks.durationMin ?? 5}
        lastBreakAt={reminders?.context.lastBreakAt ?? null}
        onDone={() => void reminders?.completeBreak()}
        onSnooze={() => void reminders?.snoozeBreak()}
        onSkip={() => void reminders?.skipBreak()}
        onWhy={setWhy}
      />
      <WhySheet topic={why} onClose={() => setWhy(null)} />
      <MeetingSheet
        open={meetingOpen}
        onClose={hideMeeting}
        onConfirm={(minutes) => {
          void reminders?.startMeeting(minutes);
          show({
            kind: 'notice',
            message:
              minutes === null
                ? t('meeting.startedOpen')
                : t('meeting.started', {
                    time: formatTime(systemClock() + minutes * 60_000, i18n.language),
                  }),
          });
        }}
      />
    </>
  );
}
