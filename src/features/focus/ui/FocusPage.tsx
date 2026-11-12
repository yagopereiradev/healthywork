import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useDataStore, useLive } from '@/data/hooks';
import { useReminders } from '@/features/notifications/remindersContext';
import { MeetingButton } from '@/features/notifications/ui/MeetingButton';
import { focusedMinutes } from '@/features/today/domain/timeline';
import { dayKey } from '@/lib/dates';
import { useFormatDuration } from '@/i18n/useFormatDuration';
import { formatClock } from '@/lib/format';
import { useNow } from '@/lib/useNow';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { cn } from '@/ui/cn';
import { PageHeader } from '@/ui/PageHeader';
import { Ring } from '@/ui/Ring';
import { Skeleton, SkeletonGroup } from '@/ui/StateViews';
import { isPaused, PRESETS, progress, remainingMs } from '../domain/timer';
import { useFocus, type FocusValue } from '../focusContext';
import { CustomBlockSheet } from './CustomBlockSheet';

export function FocusPage() {
  const { t } = useTranslation();
  const focus = useFocus();

  return (
    <>
      <PageHeader title={t('nav.focus')} actions={<MeetingButton />} />
      {focus ? (
        <FocusContent focus={focus} />
      ) : (
        <SkeletonGroup label={t('state.loading')}>
          <div className="mx-auto flex w-full max-w-lg flex-col gap-5">
            <Skeleton className="h-11 rounded-control" />
            <Skeleton className="h-[340px] rounded-sheet" />
            <Skeleton className="h-[54px] rounded-control-xl" />
          </div>
        </SkeletonGroup>
      )}
    </>
  );
}

function FocusContent({ focus }: { focus: FocusValue }) {
  const { t } = useTranslation('focus');
  const { t: tb } = useTranslation('breaks');
  const formatDuration = useFormatDuration();
  const store = useDataStore();
  const reminders = useReminders();
  const [customOpen, setCustomOpen] = useState(false);

  const { state, plan, block } = focus;
  const running = state?.phase === 'focus' ? state : null;
  const paused = running ? isPaused(running) : false;
  // A quarter of a second keeps the clock exact; the ring glides between ticks.
  const now = useNow(running && !paused ? 250 : 30_000);

  const today = dayKey(now);
  const logged = useLive(() => store.focus.watchDay(today), [store, today]);
  const loggedMinutes = logged.status === 'ready' ? focusedMinutes(logged.value) : 0;
  const runningMinutes = running
    ? Math.floor((plan.focusMin * 60_000 - remainingMs(running, now)) / 60_000)
    : 0;

  const remainingSec = running ? remainingMs(running, now) / 1000 : plan.focusMin * 60;
  const clock = formatClock(remainingSec);
  const ringLabel = !running
    ? t('ring.idle', { minutes: plan.focusMin })
    : paused
      ? t('ring.paused', { time: clock })
      : t('ring.running', { time: clock, minutes: plan.focusMin });

  const preset = PRESETS.find((p) => p.focusMin === plan.focusMin && p.breakMin === plan.breakMin);
  const nextBreak = reminders?.context.nextBreakType;

  return (
    <div className="hw-stagger mx-auto flex w-full max-w-lg flex-col gap-5">
      <div role="radiogroup" aria-label={t('presets.label')} className="grid grid-cols-3 gap-2">
        {PRESETS.map((option) => (
          <PresetButton
            key={option.focusMin}
            selected={preset === option}
            disabled={Boolean(running)}
            label={t('presets.optionLabel', { focus: option.focusMin, rest: option.breakMin })}
            onSelect={() => void focus.choosePlan(option.focusMin, option.breakMin)}
          >
            {t('presets.option', { focus: option.focusMin, rest: option.breakMin })}
          </PresetButton>
        ))}
        <PresetButton
          selected={!preset}
          disabled={Boolean(running)}
          label={
            preset
              ? t('presets.custom')
              : `${t('presets.custom')}: ${t('presets.optionLabel', { focus: plan.focusMin, rest: plan.breakMin })}`
          }
          onSelect={() => setCustomOpen(true)}
        >
          {preset
            ? t('presets.custom')
            : t('presets.option', { focus: plan.focusMin, rest: plan.breakMin })}
        </PresetButton>
      </div>

      <Card
        variant="soft"
        tone="focus"
        radius="xl"
        className="flex flex-col items-center gap-4 px-5 py-7"
      >
        <Ring
          tone="focus"
          trackOnTint
          size={230}
          stroke={16}
          progress={running ? progress(running, now) : 0}
          label={ringLabel}
          className="size-[230px]"
        >
          <span className="font-display text-[46px] leading-none font-bold tabular-nums">
            {clock}
          </span>
          <span className="mt-2 text-sm font-semibold text-focus-ink">
            {t('block', { block, total: plan.blocksPerCycle })}
          </span>
        </Ring>

        <ol
          aria-hidden="true"
          className="grid w-40 gap-1.5"
          style={{ gridTemplateColumns: `repeat(${plan.blocksPerCycle}, minmax(0, 1fr))` }}
        >
          {Array.from({ length: plan.blocksPerCycle }, (_, index) => (
            <li
              key={index}
              className={cn(
                'h-1.5 rounded-full transition-colors duration-300',
                index + 1 < block && 'bg-focus',
                index + 1 === block && (running ? 'bg-focus-weak' : 'bg-focus-line'),
                index + 1 > block && 'bg-surface',
              )}
            />
          ))}
        </ol>
      </Card>

      {running ? (
        <div className="grid grid-cols-[2fr_1fr] gap-2">
          <Button
            tone="focus"
            size="xl"
            shortcut="F"
            onClick={() => void (paused ? focus.resume() : focus.pause())}
          >
            {paused ? t('actions.resume') : t('actions.pause')}
          </Button>
          <Button variant="outline" size="xl" onClick={() => void focus.stop()}>
            {t('actions.stop')}
          </Button>
        </div>
      ) : (
        <div className={cn('grid gap-2', state ? 'grid-cols-[2fr_1fr]' : 'grid-cols-1')}>
          <Button tone="focus" size="xl" shortcut="F" onClick={() => void focus.start()}>
            {state ? t('actions.startNext', { block }) : t('actions.start')}
          </Button>
          {state ? (
            <Button variant="outline" size="xl" onClick={() => void focus.stop()}>
              {t('actions.stop')}
            </Button>
          ) : null}
        </div>
      )}

      {nextBreak ? (
        <Card variant="soft" tone="move" radius="lg" className="flex flex-col gap-0.5 p-4">
          <p className="text-[13px] font-semibold text-move-ink">{t('after.eyebrow')}</p>
          <p className="text-[15px] font-semibold">
            {t('after.text', { minutes: plan.breakMin, type: tb(`types.${nextBreak}`) })}
          </p>
        </Card>
      ) : null}

      <div className="flex flex-wrap justify-between gap-x-4 gap-y-1 text-sm text-ink-2">
        <span>{t('footer.today', { time: formatDuration(loggedMinutes + runningMinutes) })}</span>
        <span>{t('footer.reminders')}</span>
      </div>

      <CustomBlockSheet
        open={customOpen}
        onClose={() => setCustomOpen(false)}
        focusMin={plan.focusMin}
        breakMin={plan.breakMin}
        onSave={(focusMin, breakMin) => void focus.choosePlan(focusMin, breakMin)}
      />
    </div>
  );
}

function PresetButton({
  selected,
  disabled,
  label,
  onSelect,
  children,
}: {
  selected: boolean;
  disabled: boolean;
  label: string;
  onSelect: () => void;
  children: string;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      aria-label={label}
      disabled={disabled}
      onClick={onSelect}
      className={cn(
        'min-h-11 rounded-control px-2 text-sm font-semibold tabular-nums transition-colors duration-150 disabled:opacity-60',
        selected ? 'bg-focus text-focus-on' : 'border border-line bg-surface text-ink',
      )}
    >
      {children}
    </button>
  );
}
