import { useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLogBreak } from '@/features/breaks/useLogBreak';
import { useFocus } from '@/features/focus/focusContext';
import { useReminders } from '@/features/notifications/remindersContext';
import { useMeetingSheet } from '@/features/notifications/ui/meetingSheetStore';
import { useLogWater } from '@/features/water/useLogWater';
import { useShortcuts } from '@/lib/shortcuts';
import { Button } from '@/ui/Button';
import { Sheet } from '@/ui/Sheet';

/**
 * Keyboard shortcuts that work on every screen, and the "?" sheet that lists
 * them.
 */
export function GlobalShortcuts() {
  const { t } = useTranslation();
  const titleId = useId();
  const logWater = useLogWater();
  const logBreak = useLogBreak();
  const reminders = useReminders();
  const focus = useFocus();
  const showMeetingSheet = useMeetingSheet((state) => state.show);
  const [helpOpen, setHelpOpen] = useState(false);

  useShortcuts({
    w: () => void logWater(),
    p: () => void logBreak(),
    f: () => void focus?.toggle(),
    m: () => {
      if (!reminders) return;
      if (reminders.state.meeting) void reminders.endMeeting();
      else showMeetingSheet();
    },
    '?': () => setHelpOpen(true),
  });

  const rows = [
    { keys: 'W', text: t('shortcuts.water') },
    { keys: 'P', text: t('shortcuts.break') },
    { keys: 'F', text: t('shortcuts.focus') },
    { keys: 'M', text: t('shortcuts.meeting') },
    { keys: '?', text: t('shortcuts.help') },
  ];

  return (
    <Sheet open={helpOpen} onClose={() => setHelpOpen(false)} labelledBy={titleId}>
      <h2 id={titleId} className="text-[22px]">
        {t('shortcuts.title')}
      </h2>
      <dl className="flex flex-col">
        {rows.map((row) => (
          <div
            key={row.keys}
            className="flex items-center gap-4 border-divider py-3 text-[15px] not-first:border-t"
          >
            <dt>
              <kbd className="inline-flex min-w-8 justify-center rounded-lg border border-control px-2 py-1 font-sans text-sm font-semibold">
                {row.keys}
              </kbd>
            </dt>
            <dd>{row.text}</dd>
          </div>
        ))}
      </dl>
      <p className="text-[13px] text-ink-2">{t('shortcuts.note')}</p>
      <Button variant="outline" size="xl" onClick={() => setHelpOpen(false)} data-autofocus>
        {t('actions.close')}
      </Button>
    </Sheet>
  );
}
