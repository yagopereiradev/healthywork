import { AnimatePresence, motion, useIsPresent } from 'motion/react';
import { useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import type { BreakType } from '@/data/types';
import type { EvidenceTopic } from '@/features/evidence/domain/sources';
import { systemClock } from '@/lib/clock';
import { formatClock } from '@/lib/format';
import { useNow } from '@/lib/useNow';
import { Button } from '@/ui/Button';
import { cn } from '@/ui/cn';
import { Ring } from '@/ui/Ring';
import { MODAL_LAYER, useModal } from '@/ui/useModal';
import { currentStep, EXERCISE_STEPS, exerciseDurationSec, EXERCISES } from '../domain/exercises';

interface BreakScreenProps {
  /** The break on screen, or null while there is none. */
  prompt: { at: number; type: BreakType; focusBreakMin?: number } | null;
  /** Break length from settings, used for the walk. */
  breakDurationMin: number;
  /** When the previous break was logged today, if any. */
  lastBreakAt: number | null;
  onDone: () => void;
  onSnooze: () => void;
  onSkip: () => void;
  onWhy: (topic: EvidenceTopic) => void;
}

/**
 * The break reminder: a full screen in the soft movement colour, with the
 * exercise, a countdown and three plain steps. One tap to confirm, and
 * postponing or skipping is always there, without any penalty.
 */
export function BreakScreen({ prompt, ...rest }: BreakScreenProps) {
  return createPortal(
    <AnimatePresence>
      {/* One screen, whatever happens: if the prompt changes while it is open
          (the end of a focus block arriving over a regular break), the screen
          updates in place instead of a second one opening over the first. */}
      {prompt ? <BreakContent key="break" prompt={prompt} {...rest} /> : null}
    </AnimatePresence>,
    document.body,
  );
}

function BreakContent({
  prompt,
  breakDurationMin,
  lastBreakAt,
  onDone,
  onSnooze,
  onSkip,
  onWhy,
}: BreakScreenProps & { prompt: NonNullable<BreakScreenProps['prompt']> }) {
  const { t } = useTranslation('breaks');
  const { t: tc } = useTranslation();
  const titleId = useId();
  const panel = useRef<HTMLDivElement>(null);
  const present = useIsPresent();
  // Esc postpones: it is the gentlest way out, and the break comes back.
  const onKeyDown = useModal(panel, present, onSnooze);

  // The countdown starts when the screen appears, or when a newer prompt replaces the one on it.
  const [openedAt] = useState(systemClock);
  const startedAt = Math.max(openedAt, prompt.at);
  const now = useNow(250);
  // The break that closes a focus block lasts as long as that block's break.
  const durationSec =
    prompt.focusBreakMin === undefined
      ? exerciseDurationSec(prompt.type, breakDurationMin)
      : prompt.focusBreakMin * 60;
  const elapsedSec = Math.max(0, (now - startedAt) / 1000);
  const remainingSec = Math.max(0, durationSec - elapsedSec);
  const active = currentStep(elapsedSec, durationSec, EXERCISE_STEPS.length);
  const sinceLastMin = lastBreakAt === null ? null : Math.round((prompt.at - lastBreakAt) / 60_000);
  const countdown = formatClock(remainingSec);

  return (
    <motion.div
      {...{ [MODAL_LAYER]: '' }}
      className={cn(
        'fixed inset-0 z-40 overflow-y-auto bg-move-soft',
        !present && 'pointer-events-none',
      )}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.2 } }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      onKeyDown={onKeyDown}
    >
      <motion.div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="mx-auto flex min-h-full max-w-md flex-col gap-6 px-6 pt-7 pb-[max(1.5rem,env(safe-area-inset-bottom))] outline-none"
        initial={{ y: 16, scale: 0.98 }}
        animate={{ y: 0, scale: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 28 }}
      >
        <div className="flex items-center justify-between gap-3 text-[13px] font-semibold text-move-ink">
          <p className="tracking-wider uppercase">{t('screen.eyebrow')}</p>
          {sinceLastMin !== null && sinceLastMin > 0 ? (
            <p>{t('screen.sinceLast', { minutes: sinceLastMin })}</p>
          ) : null}
        </div>

        <div className="flex flex-col gap-2">
          <h2 id={titleId} className="text-[30px] leading-[1.15]">
            {t(`exercises.${prompt.type}.title`)}
          </h2>
          <p className="text-move-ink-2">
            {t(`exercises.${prompt.type}.lead`)}{' '}
            <button
              type="button"
              aria-haspopup="dialog"
              onClick={() => onWhy(EXERCISES[prompt.type].evidence)}
              className="-my-2.5 inline-block rounded-md py-2.5 font-semibold text-move-ink underline underline-offset-2"
            >
              {tc('actions.why')}
            </button>
          </p>
        </div>

        <Ring
          tone="move"
          filled
          progress={durationSec > 0 ? remainingSec / durationSec : 0}
          label={t('screen.remaining', { time: countdown })}
          className="size-[200px] self-center"
        >
          <span className="font-display text-[44px] font-bold tabular-nums">{countdown}</span>
        </Ring>

        <ol
          aria-label={t('screen.steps')}
          className="flex flex-col rounded-[1.25rem] bg-surface px-[18px] py-1.5"
        >
          {EXERCISE_STEPS.map((step, index) => (
            <li
              key={step}
              className={cn(
                'flex items-center gap-3.5 border-move-soft py-3 text-[15px] not-first:border-t',
                index === active && 'font-semibold',
              )}
            >
              <span
                aria-hidden="true"
                className={cn(
                  'flex size-7 shrink-0 items-center justify-center rounded-full font-display text-sm font-semibold transition-colors duration-300',
                  index === active ? 'bg-move text-move-on' : 'bg-move-soft text-move-ink',
                )}
              >
                {index + 1}
              </span>
              {t(`exercises.${prompt.type}.${step}`)}
            </li>
          ))}
        </ol>

        <div className="mt-auto flex flex-col gap-2">
          <Button tone="move" size="xl" onClick={onDone} data-autofocus>
            {t('screen.done')}
          </Button>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" tone="move" size="lg" onClick={onSnooze}>
              {t('screen.snooze')}
            </Button>
            <Button variant="ghost" tone="move" size="lg" onClick={onSkip}>
              {t('screen.skip')}
            </Button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
