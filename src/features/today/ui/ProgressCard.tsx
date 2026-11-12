import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { plannedBreaks } from '@/features/breaks/domain/breaks';
import type { EvidenceTopic } from '@/features/evidence/domain/sources';
import { goalProgress, totalMl } from '@/features/water/domain/water';
import { WaterGlass } from '@/features/water/ui/WaterGlass';
import { useFormatDuration } from '@/i18n/useFormatDuration';
import { formatNumber } from '@/lib/format';
import { AnimatedNumber } from '@/ui/AnimatedNumber';
import { Card } from '@/ui/Card';
import { ProgressBar } from '@/ui/ProgressBar';
import type { Tone } from '@/ui/tones';
import { focusedMinutes } from '../domain/timeline';
import type { TodayData } from '../useToday';

interface ProgressCardProps {
  data: TodayData;
  onWhy: (topic: EvidenceTopic) => void;
}

/** The three bars of the day: water, breaks and focus, each in its own colour. */
export function ProgressCard({ data, onWhy }: ProgressCardProps) {
  const { t, i18n } = useTranslation('today');
  const { t: tc } = useTranslation();
  const { t: tw } = useTranslation('water');
  const formatDuration = useFormatDuration();
  const number = (value: number) => formatNumber(value, i18n.language);

  const { settings } = data;
  const waterTotal = totalMl(data.water);
  const water = goalProgress(waterTotal, settings.water.goalMl);
  const breaksDone = data.breaks.length;
  const breaksPlanned = plannedBreaks(settings.workday, settings.breaks.everyMin);
  const focusMinutes = focusedMinutes(data.focus);
  const focusGoal = settings.focus.dailyGoalMin;

  return (
    <Card
      as="section"
      aria-label={t('progress.title')}
      className="flex flex-col gap-3 px-[18px] py-4 md:gap-5 md:rounded-card-lg md:px-7 md:py-6"
    >
      <Row
        tone="water"
        name={tc('modules.water')}
        why={tc('actions.why')}
        onWhy={() => onWhy('water')}
        value={waterTotal}
        max={settings.water.goalMl}
        valueText={t('progress.water', {
          current: number(waterTotal),
          goal: number(settings.water.goalMl),
        })}
        current={<Current value={waterTotal} format={number} />}
        rest={t('progress.waterRest', { goal: number(settings.water.goalMl) })}
        aside={
          <WaterGlass
            ratio={water.ratio}
            reached={water.reached}
            label={
              water.reached
                ? tw('glassReached')
                : tw('glass', { percent: Math.round(water.ratio * 100) })
            }
            className="h-[42px] w-[30px] md:h-[51px] md:w-9"
          />
        }
      />
      <Row
        tone="move"
        name={tc('modules.breaks')}
        why={tc('actions.why')}
        onWhy={() => onWhy('breaks')}
        value={breaksDone}
        max={breaksPlanned}
        valueText={t('progress.breaks', {
          done: number(breaksDone),
          planned: number(breaksPlanned),
        })}
        current={<Current value={breaksDone} format={number} />}
        rest={t('progress.breaksRest', { planned: number(breaksPlanned) })}
      />
      <Row
        tone="focus"
        name={tc('modules.focus')}
        why={tc('actions.why')}
        onWhy={() => onWhy('focus')}
        value={focusMinutes}
        max={focusGoal}
        valueText={t('progress.focus', {
          current: formatDuration(focusMinutes),
          goal: formatDuration(focusGoal),
        })}
        current={<Current value={focusMinutes} format={(m) => formatDuration(m)} />}
        rest={t('progress.focusRest', { goal: formatDuration(focusGoal) })}
      />
    </Card>
  );
}

/** The current value: plain on a phone, in large Sora numerals on a computer. */
function Current({ value, format }: { value: number; format: (value: number) => string }) {
  return (
    <AnimatedNumber
      value={value}
      format={format}
      className="md:font-display md:text-[22px] md:font-bold md:text-ink"
    />
  );
}

interface RowProps {
  tone: Tone;
  name: string;
  why: string;
  onWhy: () => void;
  value: number;
  max: number;
  valueText: string;
  current: ReactNode;
  rest: string;
  aside?: ReactNode;
}

function Row({ tone, name, why, onWhy, value, max, valueText, current, rest, aside }: RowProps) {
  return (
    <div className="flex items-center gap-3 md:gap-4">
      <div className="flex min-w-0 flex-1 flex-col gap-1.5 md:gap-2">
        <div className="flex items-baseline justify-between gap-3 text-sm md:text-[15px]">
          <span className="font-semibold">
            {name}
            <button
              type="button"
              aria-haspopup="dialog"
              // The name starts with the visible text and adds which bar it is about.
              aria-label={`${why} ${name}`}
              onClick={onWhy}
              className="-my-3 ml-1.5 inline-block rounded-md px-1 py-3 text-[13px] font-medium underline underline-offset-2 hover:text-ink-2 md:ml-2"
            >
              {why}
            </button>
          </span>
          <span className="text-right text-ink-2 tabular-nums">
            {current} {rest}
          </span>
        </div>
        <ProgressBar
          tone={tone}
          value={value}
          max={max}
          label={name}
          valueText={valueText}
          className="md:h-3"
        />
      </div>
      {aside}
    </div>
  );
}
