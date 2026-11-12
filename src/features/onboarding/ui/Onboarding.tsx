import { AnimatePresence, motion } from 'motion/react';
import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useDataStore } from '@/data/hooks';
import type { Settings, Weekday } from '@/data/settings';
import type { EvidenceTopic } from '@/features/evidence/domain/sources';
import { WhySheet } from '@/features/evidence/ui/WhySheet';
import {
  notificationPermission,
  requestNotificationPermission,
} from '@/features/notifications/systemNotifications';
import { remindersPerDay, WATER_GOALS_ML } from '@/features/settings/domain/options';
import { WorkHoursFields } from '@/features/settings/ui/editors';
import { useFormatDuration } from '@/i18n/useFormatDuration';
import { formatNumber } from '@/lib/format';
import { requestPersistentStorage } from '@/lib/storage-persistence';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { ChoiceList } from '@/ui/ChoiceList';
import { cn } from '@/ui/cn';
import { Logo, LogoMark } from '@/ui/Logo';
import { WeekdayPicker } from '@/ui/WeekdayPicker';

const STEPS = 3;

/**
 * The first run, in three steps: the water goal, the working hours and days,
 * and whether reminders may arrive as notifications. Everything here has a
 * sensible default already chosen, so "Continue" three times is a valid answer.
 * This is the only place the app asks for the notification permission unprompted.
 */
export function Onboarding({ settings }: { settings: Settings }) {
  const { t, i18n } = useTranslation('onboarding');
  const { t: tc } = useTranslation();
  const { t: tb } = useTranslation('breaks');
  const { t: tr } = useTranslation('reminders');
  const store = useDataStore();
  const formatDuration = useFormatDuration();

  const [step, setStep] = useState(1);
  const [goalMl, setGoalMl] = useState(String(settings.water.goalMl));
  const [start, setStart] = useState(settings.workday.start);
  const [end, setEnd] = useState(settings.workday.end);
  const [days, setDays] = useState<Weekday[]>([...settings.workday.days]);
  const [permission, setPermission] = useState(notificationPermission);
  const [why, setWhy] = useState<EvidenceTopic | null>(null);
  const number = (value: number) => formatNumber(value, i18n.language);

  const estimate = remindersPerDay({
    ...settings,
    workday: { start: start || settings.workday.start, end: end || settings.workday.end, days },
  });

  const finish = async (system: boolean) => {
    await store.settings.update({
      water: { goalMl: Number(goalMl) },
      workday: { start: start || settings.workday.start, end: end || settings.workday.end, days },
      notifications: { system },
      onboardingDone: true,
    });
    // From here on the person has data worth keeping.
    void requestPersistentStorage();
  };

  const enableNotifications = async () => {
    const result = await requestNotificationPermission();
    setPermission(result);
    if (result === 'granted') await finish(true);
  };

  const canAsk = permission === 'default';

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-7 px-6 pt-7 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
      <header className="flex flex-col gap-7">
        <div className="flex items-center justify-between gap-3">
          <Logo size={28} className="gap-2 text-[17px]" />
          <p className="text-[13px] font-semibold text-ink-2">
            {t('step', { step, total: STEPS })}
          </p>
        </div>
        <div
          role="progressbar"
          aria-label={t('step', { step, total: STEPS })}
          aria-valuemin={1}
          aria-valuemax={STEPS}
          aria-valuenow={step}
          className="grid grid-cols-3 gap-1.5"
        >
          {Array.from({ length: STEPS }, (_, index) => (
            <span
              key={index}
              className={cn(
                'h-1.5 rounded-full transition-colors duration-300',
                index < step ? 'bg-water' : 'bg-line',
              )}
            />
          ))}
        </div>
      </header>

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={step}
          className="flex flex-1 flex-col gap-7"
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -24, transition: { duration: 0.12 } }}
          transition={{ type: 'spring', stiffness: 380, damping: 34 }}
        >
          {step === 1 ? (
            <Step title={t('water.title')} body={t('water.body')}>
              <ChoiceList
                label={t('water.label')}
                value={goalMl}
                onChange={setGoalMl}
                choices={WATER_GOALS_ML.map((amount) => ({
                  value: String(amount),
                  label: t('water.option', { amount: number(amount) }),
                  detail: amount === 2000 ? t('water.suggested') : undefined,
                }))}
              />
              <button
                type="button"
                aria-haspopup="dialog"
                onClick={() => setWhy('water')}
                className="self-start rounded-md py-2.5 text-sm font-semibold text-water-ink underline underline-offset-2"
              >
                {tc('actions.why')}
              </button>
            </Step>
          ) : null}

          {step === 2 ? (
            <Step title={t('workday.title')} body={t('workday.body')}>
              <Card radius="lg" className="flex flex-col gap-5 p-5">
                <WorkHoursFields start={start} end={end} onStart={setStart} onEnd={setEnd} />
                <div className="flex flex-col gap-2">
                  <p className="text-[13px] font-semibold text-ink-2">{t('workday.days')}</p>
                  <WeekdayPicker
                    label={t('workday.days')}
                    value={days}
                    onChange={setDays}
                    locale={i18n.language}
                  />
                </div>
              </Card>
              <Card
                variant="soft"
                tone="water"
                radius="notice"
                role="status"
                className="px-4 py-3.5 text-sm leading-[1.45]"
              >
                {days.length === 0
                  ? t('workday.noDays')
                  : t('workday.estimate', {
                      hours: formatDuration(estimate.workMinutes),
                      water: number(estimate.water),
                      breaks: number(estimate.breaks),
                    })}
              </Card>
            </Step>
          ) : null}

          {step === 3 ? (
            <Step title={t('notifications.title')} body={t('notifications.body')}>
              <figure className="flex flex-col gap-2">
                <figcaption className="text-[13px] font-semibold text-ink-2">
                  {t('notifications.exampleLabel')}
                </figcaption>
                <div className="flex items-center gap-3 rounded-2xl bg-raised p-3.5 shadow-float">
                  <LogoMark size={40} />
                  <div className="flex min-w-0 flex-col">
                    <span className="text-xs text-ink-2">{t('notifications.exampleApp')}</span>
                    <span className="text-[15px] font-semibold">{tr('break.title')}</span>
                    <span className="text-sm text-ink-2">{tb('exercises.walk.title')}</span>
                  </div>
                </div>
              </figure>
              <p className="text-sm text-ink-2">{t('notifications.note')}</p>
              {canAsk ? null : permission === 'granted' ? null : (
                <p role="status" className="text-sm font-medium text-move-ink">
                  {t('notifications.denied')}
                </p>
              )}
            </Step>
          ) : null}
        </motion.div>
      </AnimatePresence>

      <footer className="flex flex-col gap-2">
        {step < STEPS ? (
          <Button tone="water" size="xl" onClick={() => setStep(step + 1)}>
            {t('continue')}
          </Button>
        ) : canAsk ? (
          <>
            <Button tone="water" size="xl" onClick={() => void enableNotifications()}>
              {t('notifications.enable')}
            </Button>
            <Button variant="ghost" size="lg" onClick={() => void finish(false)}>
              {t('notifications.skip')}
            </Button>
          </>
        ) : (
          <Button tone="water" size="xl" onClick={() => void finish(permission === 'granted')}>
            {t('notifications.finish')}
          </Button>
        )}
        {step > 1 ? (
          <Button variant="ghost" size="lg" onClick={() => setStep(step - 1)}>
            {t('back')}
          </Button>
        ) : null}
      </footer>

      <WhySheet topic={why} onClose={() => setWhy(null)} />
    </main>
  );
}

function Step({ title, body, children }: { title: string; body: string; children: ReactNode }) {
  return (
    <>
      <div className="flex flex-col gap-2">
        <h1 className="text-[28px] leading-[1.2]">{title}</h1>
        <p className="text-ink-2">{body}</p>
      </div>
      {children}
    </>
  );
}
