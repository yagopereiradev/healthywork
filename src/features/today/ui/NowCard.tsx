import { useTranslation } from 'react-i18next';
import { isPaused, progress, remainingMs } from '@/features/focus/domain/timer';
import { useFocus } from '@/features/focus/focusContext';
import { formatClock } from '@/lib/format';
import { useNow } from '@/lib/useNow';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { cn } from '@/ui/cn';
import { ProgressBar } from '@/ui/ProgressBar';
import { TONES } from '@/ui/tones';

/**
 * The "Now" card, in the focus colour.
 *
 * With a block on the clock it shows the block, the time left and the pause
 * button. Otherwise it is an invitation: to start a block, or the next one of
 * the cycle. `roomy` is the computer layout: larger clock, a progress bar and
 * the button to end the session.
 */
export function NowCard({ roomy }: { roomy: boolean }) {
  const { t } = useTranslation('focus');
  const { t: tt } = useTranslation('today');
  const focus = useFocus();
  const running = focus?.state?.phase === 'focus' ? focus.state : null;
  const paused = running ? isPaused(running) : false;
  const now = useNow(running && !paused ? 250 : 30_000);
  const muted = TONES.focus.solidMuted;

  if (!focus) return null;
  const { plan, block, state } = focus;
  const blockOf = { block, total: plan.blocksPerCycle };

  return (
    <Card
      as="section"
      variant="solid"
      tone="focus"
      className={cn(
        'flex min-w-0 flex-[1_1_260px] px-[18px] py-4 md:rounded-card-lg md:px-7 md:py-6',
        roomy ? 'flex-col gap-4' : 'flex-wrap items-center justify-between gap-x-4 gap-y-3',
      )}
    >
      {running ? (
        <>
          <div className="flex min-w-0 flex-col gap-0.5">
            <p className={cn('text-[13px] font-semibold md:text-sm', muted)}>
              {paused ? t('now.paused', blockOf) : t('now.running', blockOf)}
            </p>
            {/* A clock that changes every second is not read out loud each time. */}
            <p
              role="timer"
              aria-live="off"
              className={cn(
                'font-display font-bold tabular-nums',
                roomy ? 'text-[64px] leading-none' : 'text-[32px] leading-[1.1]',
              )}
            >
              {formatClock(remainingMs(running, now) / 1000)}
            </p>
          </div>
          {roomy ? (
            <ProgressBar
              onSolid
              tone="focus"
              value={Math.round(progress(running, now) * 100)}
              max={100}
              label={t('block', blockOf)}
            />
          ) : null}
          <div className="flex flex-wrap gap-2">
            <Button
              variant="inverse"
              tone="focus"
              size={roomy ? 'lg' : 'md'}
              shortcut="F"
              onClick={() => void (paused ? focus.resume() : focus.pause())}
            >
              {paused ? t('actions.resume') : t('actions.pause')}
            </Button>
            {roomy ? (
              <Button
                variant="inverse-outline"
                tone="focus"
                size="lg"
                onClick={() => void focus.stop()}
              >
                {t('actions.stop')}
              </Button>
            ) : null}
          </div>
        </>
      ) : (
        <>
          <div className="flex min-w-0 flex-col gap-0.5">
            <p className={cn('text-[13px] font-semibold md:text-sm', muted)}>
              {state ? t('now.ready', blockOf) : tt('now.eyebrow')}
            </p>
            <h2 className="text-xl md:text-[26px]">
              {state ? t('now.readyTitle') : tt('now.idleTitle')}
            </h2>
            <p className={cn('text-sm md:text-[15px]', muted)}>
              {tt('now.idleBody', { focus: plan.focusMin, rest: plan.breakMin })}
            </p>
          </div>
          <div className="flex">
            <Button
              variant="inverse"
              tone="focus"
              size="lg"
              shortcut="F"
              onClick={() => void focus.start()}
            >
              {state ? t('actions.startNext', { block }) : tt('now.start')}
            </Button>
          </div>
        </>
      )}
    </Card>
  );
}
