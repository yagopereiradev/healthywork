import { useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { systemClock } from '@/lib/clock';
import { formatTime } from '@/lib/format';
import { Button } from '@/ui/Button';
import { ChoiceList } from '@/ui/ChoiceList';
import { Sheet } from '@/ui/Sheet';

type Duration = '30' | '60' | 'open';
const MINUTES: Record<Duration, number | null> = { '30': 30, '60': 60, open: null };

interface MeetingSheetProps {
  open: boolean;
  onClose: () => void;
  /** Minutes of silence, or null for "until I am back". */
  onConfirm: (minutes: number | null) => void;
}

/** "In a meeting?": silence every reminder for a while. They come back on their own. */
export function MeetingSheet({ open, onClose, onConfirm }: MeetingSheetProps) {
  const titleId = useId();
  return (
    <Sheet open={open} onClose={onClose} labelledBy={titleId}>
      <MeetingForm titleId={titleId} onClose={onClose} onConfirm={onConfirm} />
    </Sheet>
  );
}

function MeetingForm({
  titleId,
  onClose,
  onConfirm,
}: Omit<MeetingSheetProps, 'open'> & { titleId: string }) {
  const { t, i18n } = useTranslation('reminders');
  const { t: tc } = useTranslation();
  const [duration, setDuration] = useState<Duration>('30');
  // The return times shown are counted from the moment the sheet opened.
  const [openedAt] = useState(systemClock);
  const until = (minutes: number) =>
    t('meeting.until', { time: formatTime(openedAt + minutes * 60_000, i18n.language) });

  return (
    <>
      <header className="flex flex-col gap-1">
        <h2 id={titleId} className="text-[22px]">
          {t('meeting.title')}
        </h2>
        <p className="text-[15px] leading-[1.45] text-ink-2">{t('meeting.body')}</p>
      </header>

      <ChoiceList<Duration>
        label={t('meeting.duration')}
        value={duration}
        onChange={setDuration}
        choices={[
          { value: '30', label: t('meeting.option30'), detail: until(30) },
          { value: '60', label: t('meeting.option60'), detail: until(60) },
          { value: 'open', label: t('meeting.optionOpen'), detail: t('meeting.manual') },
        ]}
      />

      <div className="grid grid-cols-[1fr_2fr] gap-2">
        <Button variant="ghost" size="xl" onClick={onClose}>
          {tc('actions.cancel')}
        </Button>
        <Button
          tone="water"
          size="xl"
          data-autofocus
          onClick={() => {
            onConfirm(MINUTES[duration]);
            onClose();
          }}
        >
          {t('meeting.confirm')}
        </Button>
      </div>
    </>
  );
}
