import { useId, useState, type FormEvent, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import type { Settings, Weekday } from '@/data/settings';
import { BREAK_TYPES, type BreakType } from '@/data/types';
import { formatNumber } from '@/lib/format';
import { Button } from '@/ui/Button';
import { ChoiceList } from '@/ui/ChoiceList';
import { Sheet } from '@/ui/Sheet';
import { SwitchRow } from '@/ui/Switch';
import type { Tone } from '@/ui/tones';
import { WeekdayPicker } from '@/ui/WeekdayPicker';
import { parseWaterGoal, WATER_GOAL_LIMITS, WATER_GOALS_ML } from '../domain/options';

interface EditorProps {
  open: boolean;
  onClose: () => void;
}

const INPUT =
  'min-h-12 w-full rounded-control border border-control bg-surface px-3 font-display text-lg font-semibold tabular-nums';

/** The frame every editor shares: title, one line of context, the fields, Cancel and Save. */
function EditorForm({
  titleId,
  title,
  body,
  tone = 'water',
  onClose,
  onSubmit,
  children,
}: {
  titleId: string;
  title: string;
  body: string;
  tone?: Tone;
  onClose: () => void;
  /** Return false to keep the sheet open. */
  onSubmit: () => boolean;
  children: ReactNode;
}) {
  const { t } = useTranslation('settings');
  const { t: tc } = useTranslation();
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (onSubmit()) onClose();
  };

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-4">
      <header className="flex flex-col gap-1">
        <h2 id={titleId} className="text-[22px]">
          {title}
        </h2>
        <p className="text-[15px] leading-[1.45] text-ink-2">{body}</p>
      </header>
      {children}
      <div className="grid grid-cols-[1fr_2fr] gap-2">
        <Button variant="ghost" size="xl" onClick={onClose}>
          {tc('actions.cancel')}
        </Button>
        <Button type="submit" tone={tone} size="xl">
          {t('save')}
        </Button>
      </div>
    </form>
  );
}

/** Daily water goal: the usual amounts, or one typed in. */
export function WaterGoalSheet({
  open,
  onClose,
  goalMl,
  onSave,
}: EditorProps & { goalMl: number; onSave: (goalMl: number) => void }) {
  const titleId = useId();
  return (
    <Sheet open={open} onClose={onClose} labelledBy={titleId}>
      <WaterGoalForm titleId={titleId} onClose={onClose} goalMl={goalMl} onSave={onSave} />
    </Sheet>
  );
}

const CUSTOM = 'custom';

function WaterGoalForm({
  titleId,
  onClose,
  goalMl,
  onSave,
}: {
  titleId: string;
  onClose: () => void;
  goalMl: number;
  onSave: (goalMl: number) => void;
}) {
  const { t, i18n } = useTranslation('settings');
  const inputId = useId();
  const errorId = useId();
  const isPreset = (WATER_GOALS_ML as readonly number[]).includes(goalMl);
  const [choice, setChoice] = useState<string>(isPreset ? String(goalMl) : CUSTOM);
  const [text, setText] = useState(isPreset ? '' : String(goalMl));
  const [showError, setShowError] = useState(false);
  const number = (value: number) => formatNumber(value, i18n.language);

  const goal = choice === CUSTOM ? parseWaterGoal(text) : Number(choice);
  const invalid = choice === CUSTOM && showError && goal === null;

  return (
    <EditorForm
      titleId={titleId}
      title={t('water.goal')}
      body={t('water.goalBody')}
      onClose={onClose}
      onSubmit={() => {
        if (goal === null) {
          setShowError(true);
          return false;
        }
        onSave(goal);
        return true;
      }}
    >
      <ChoiceList
        label={t('water.goal')}
        value={choice}
        onChange={(next) => {
          setChoice(next);
          setShowError(false);
        }}
        choices={[
          ...WATER_GOALS_ML.map((amount) => ({
            value: String(amount),
            label: t('water.goalValue', { amount: number(amount) }),
          })),
          { value: CUSTOM, label: t('water.custom') },
        ]}
      />
      {choice === CUSTOM ? (
        <div className="flex flex-col gap-1.5">
          <label htmlFor={inputId} className="text-[13px] font-semibold text-ink-2">
            {t('water.customLabel')}
          </label>
          <input
            id={inputId}
            // The person just chose "Another amount": typing it is the next step.
            // eslint-disable-next-line jsx-a11y/no-autofocus
            autoFocus
            inputMode="numeric"
            autoComplete="off"
            value={text}
            onChange={(event) => setText(event.target.value)}
            aria-invalid={invalid}
            aria-describedby={invalid ? errorId : undefined}
            className={INPUT}
          />
          {invalid ? (
            <p id={errorId} role="alert" className="text-[13px] font-medium text-move-ink">
              {t('water.goalInvalid', {
                min: number(WATER_GOAL_LIMITS.min),
                max: number(WATER_GOAL_LIMITS.max),
              })}
            </p>
          ) : null}
        </div>
      ) : null}
    </EditorForm>
  );
}

/** Which kinds of break take part in the rotation. At least one stays on. */
export function BreakTypesSheet({
  open,
  onClose,
  types,
  onSave,
}: EditorProps & { types: readonly BreakType[]; onSave: (types: BreakType[]) => void }) {
  const titleId = useId();
  return (
    <Sheet open={open} onClose={onClose} labelledBy={titleId}>
      <BreakTypesForm titleId={titleId} onClose={onClose} types={types} onSave={onSave} />
    </Sheet>
  );
}

function BreakTypesForm({
  titleId,
  onClose,
  types,
  onSave,
}: {
  titleId: string;
  onClose: () => void;
  types: readonly BreakType[];
  onSave: (types: BreakType[]) => void;
}) {
  const { t } = useTranslation('settings');
  const { t: tb } = useTranslation('breaks');
  const [enabled, setEnabled] = useState<readonly BreakType[]>(types);
  const [showError, setShowError] = useState(false);

  return (
    <EditorForm
      titleId={titleId}
      title={t('breaks.types')}
      body={t('breaks.typesBody')}
      tone="move"
      onClose={onClose}
      onSubmit={() => {
        if (enabled.length === 0) {
          setShowError(true);
          return false;
        }
        // Saved in the canonical order, so the rotation does not depend on tap order.
        onSave(BREAK_TYPES.filter((type) => enabled.includes(type)));
        return true;
      }}
    >
      <div className="flex flex-col divide-y divide-divider rounded-card-sm bg-surface">
        {BREAK_TYPES.map((type) => (
          <SwitchRow
            key={type}
            label={tb(`exercises.${type}.title`)}
            checked={enabled.includes(type)}
            onChange={(on) => {
              setShowError(false);
              setEnabled(on ? [...enabled, type] : enabled.filter((other) => other !== type));
            }}
          />
        ))}
      </div>
      {showError ? (
        <p role="alert" className="text-[13px] font-medium text-move-ink">
          {t('breaks.typesMin')}
        </p>
      ) : null}
    </EditorForm>
  );
}

/** When the working day starts and ends. */
export function WorkHoursSheet({
  open,
  onClose,
  workday,
  onSave,
}: EditorProps & {
  workday: Settings['workday'];
  onSave: (hours: { start: string; end: string }) => void;
}) {
  const titleId = useId();
  return (
    <Sheet open={open} onClose={onClose} labelledBy={titleId}>
      <WorkHoursForm titleId={titleId} onClose={onClose} workday={workday} onSave={onSave} />
    </Sheet>
  );
}

function WorkHoursForm({
  titleId,
  onClose,
  workday,
  onSave,
}: {
  titleId: string;
  onClose: () => void;
  workday: Settings['workday'];
  onSave: (hours: { start: string; end: string }) => void;
}) {
  const { t } = useTranslation('settings');
  const [start, setStart] = useState(workday.start);
  const [end, setEnd] = useState(workday.end);

  return (
    <EditorForm
      titleId={titleId}
      title={t('workday.hours')}
      body={t('workday.hoursBody')}
      onClose={onClose}
      onSubmit={() => {
        if (!start || !end) return false;
        onSave({ start, end });
        return true;
      }}
    >
      <WorkHoursFields start={start} end={end} onStart={setStart} onEnd={setEnd} />
    </EditorForm>
  );
}

/** The two time fields, shared with onboarding. */
export function WorkHoursFields({
  start,
  end,
  onStart,
  onEnd,
}: {
  start: string;
  end: string;
  onStart: (time: string) => void;
  onEnd: (time: string) => void;
}) {
  const { t } = useTranslation('settings');
  const startId = useId();
  const endId = useId();
  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="flex flex-col gap-1.5">
        <label htmlFor={startId} className="text-[13px] font-semibold text-ink-2">
          {t('workday.start')}
        </label>
        <input
          id={startId}
          type="time"
          required
          value={start}
          onChange={(event) => onStart(event.target.value)}
          className={INPUT}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor={endId} className="text-[13px] font-semibold text-ink-2">
          {t('workday.end')}
        </label>
        <input
          id={endId}
          type="time"
          required
          value={end}
          onChange={(event) => onEnd(event.target.value)}
          className={INPUT}
        />
      </div>
    </div>
  );
}

/** Which days of the week are working days. */
export function WorkDaysSheet({
  open,
  onClose,
  days,
  onSave,
}: EditorProps & { days: readonly Weekday[]; onSave: (days: Weekday[]) => void }) {
  const titleId = useId();
  return (
    <Sheet open={open} onClose={onClose} labelledBy={titleId}>
      <WorkDaysForm titleId={titleId} onClose={onClose} days={days} onSave={onSave} />
    </Sheet>
  );
}

function WorkDaysForm({
  titleId,
  onClose,
  days,
  onSave,
}: {
  titleId: string;
  onClose: () => void;
  days: readonly Weekday[];
  onSave: (days: Weekday[]) => void;
}) {
  const { t, i18n } = useTranslation('settings');
  const [selected, setSelected] = useState<Weekday[]>([...days]);

  return (
    <EditorForm
      titleId={titleId}
      title={t('workday.days')}
      body={t('workday.daysBody')}
      onClose={onClose}
      onSubmit={() => {
        onSave(selected);
        return true;
      }}
    >
      <WeekdayPicker
        label={t('workday.days')}
        value={selected}
        onChange={setSelected}
        locale={i18n.language}
      />
    </EditorForm>
  );
}
