import { Droplet, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { DEFAULT_AMOUNT_ML, goalProgress } from '@/features/water/domain/water';
import { useLogWater } from '@/features/water/useLogWater';
import { formatNumber } from '@/lib/format';
import { Button } from '@/ui/Button';
import { useReminders } from '../remindersContext';

/**
 * The water reminder inside the app: a quiet banner at the top of the page,
 * with the one-tap answer on it. It is what people see when system
 * notifications are off, and it stays until it is answered.
 */
export function WaterBanner() {
  const { t, i18n } = useTranslation('reminders');
  const reminders = useReminders();
  const logWater = useLogWater();
  const visible = Boolean(reminders?.state.prompts.water);
  const number = (value: number) => formatNumber(value, i18n.language);

  return (
    <AnimatePresence initial={false}>
      {visible && reminders ? (
        <motion.section
          role="status"
          aria-label={t('water.title')}
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, transition: { duration: 0.15 } }}
          transition={{ type: 'spring', stiffness: 420, damping: 34 }}
          className="flex flex-wrap items-center gap-x-4 gap-y-3 rounded-card bg-water-soft py-3 pr-2 pl-4"
        >
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-surface text-water-ink">
            <Droplet aria-hidden="true" size={20} strokeWidth={2} />
          </span>
          <div className="flex min-w-40 flex-1 flex-col">
            <p className="font-display text-base font-semibold">{t('water.title')}</p>
            <p className="text-sm text-ink-2">
              {t('water.body', {
                amount: number(
                  goalProgress(
                    reminders.context.waterTotalMl,
                    reminders.context.settings.water.goalMl,
                  ).remainingMl,
                ),
              })}
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            <Button tone="water" onClick={() => void logWater()}>
              {t('water.log', { amount: number(DEFAULT_AMOUNT_ML) })}
            </Button>
            <Button variant="outline" tone="water" onClick={() => void reminders.snoozeWater()}>
              {t('water.snooze')}
            </Button>
            <button
              type="button"
              aria-label={t('water.dismiss')}
              onClick={() => void reminders.dismissWater()}
              className="flex size-11 items-center justify-center rounded-control text-ink-2 hover:text-ink"
            >
              <X aria-hidden="true" size={18} strokeWidth={2.25} />
            </button>
          </div>
        </motion.section>
      ) : null}
    </AnimatePresence>
  );
}
