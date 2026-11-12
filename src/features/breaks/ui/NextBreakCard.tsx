import { useTranslation } from 'react-i18next';
import { upcomingReminders } from '@/features/notifications/domain/reminders';
import { useReminders } from '@/features/notifications/remindersContext';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';

/**
 * "Up next": the break that is coming, in the movement colour. It can be done
 * right away or pushed 10 minutes. Nothing is shown when no break is on the
 * way: outside working hours, in a meeting, or with one already on screen.
 */
export function NextBreakCard() {
  const { t } = useTranslation('breaks');
  const reminders = useReminders();
  // While reminders are silenced, the notice on the page says so. Offering a break here would contradict it.
  if (!reminders || reminders.state.meeting) return null;

  const next = upcomingReminders(reminders.state, reminders.context).find(
    (reminder) => reminder.kind === 'breaks',
  );
  if (!next || next.kind !== 'breaks') return null;
  const minutes = Math.ceil((next.at - reminders.context.now) / 60_000);

  return (
    <Card
      as="section"
      variant="soft"
      tone="move"
      radius="lg"
      className="flex min-w-0 flex-[1_1_260px] flex-col gap-3 px-7 py-6"
    >
      <p className="text-sm font-semibold text-move-ink">
        {minutes > 1 ? t('next.eyebrowIn', { minutes }) : t('next.eyebrowSoon')}
      </p>
      <h2 className="text-[26px] leading-[1.15]">{t(`exercises.${next.type}.title`)}</h2>
      <p className="text-[15px] leading-[1.45] text-move-ink-2">
        {t(`exercises.${next.type}.lead`)}
      </p>
      <div className="mt-auto flex flex-wrap gap-2 pt-1">
        <Button tone="move" size="lg" onClick={() => void reminders.startBreakNow(next.type)}>
          {t('next.doNow')}
        </Button>
        {/* A break that closes a focus block comes with the block: it cannot be pushed on its own. */}
        {reminders.context.holdBreaksUntil ? null : (
          <Button
            variant="outline"
            tone="move"
            size="lg"
            onClick={() => void reminders.postponeNextBreak()}
          >
            {t('next.snooze')}
          </Button>
        )}
      </div>
    </Card>
  );
}
