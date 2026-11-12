import { useRef, useState, type ChangeEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { writeBootPrefs } from '@/app/bootPrefs';
import type { BackupData } from '@/data/backup';
import { useDataStore, useSettings } from '@/data/hooks';
import {
  LANGUAGES,
  THEME_PREFERENCES,
  type Language,
  type Settings,
  type ThemePreference,
} from '@/data/settings';
import { PRESETS } from '@/features/focus/domain/timer';
import { CustomBlockSheet } from '@/features/focus/ui/CustomBlockSheet';
import { NotificationSettings } from '@/features/notifications/ui/NotificationSettings';
import { LANGUAGE_NAMES } from '@/i18n/languages';
import { useFormatDuration } from '@/i18n/useFormatDuration';
import { systemClock } from '@/lib/clock';
import { formatNumber } from '@/lib/format';
import { Card } from '@/ui/Card';
import { ChoiceSheet } from '@/ui/ChoiceSheet';
import { ConfirmSheet } from '@/ui/ConfirmSheet';
import { PageHeader } from '@/ui/PageHeader';
import { SettingsGroup, SettingsValueRow } from '@/ui/SettingsGroup';
import { ErrorState, Skeleton, SkeletonGroup } from '@/ui/StateViews';
import { useToasts } from '@/ui/toast/toastStore';
import { downloadBackup, readBackupFile, type ImportProblem } from '../dataFile';
import {
  BREAK_PACES_MIN,
  FOCUS_GOALS_MIN,
  RECOMMENDED_PACE_MIN,
  summarizeDays,
  WATER_INTERVALS_MIN,
} from '../domain/options';
import { BreakTypesSheet, WaterGoalSheet, WorkDaysSheet, WorkHoursSheet } from './editors';
import { InstallSettings } from './InstallSettings';

export function SettingsPage() {
  const { t } = useTranslation();
  const settings = useSettings();

  return (
    <>
      <PageHeader title={t('nav.settings')} />
      <div className="hw-stagger flex w-full max-w-2xl flex-col gap-3.5">
        {settings.status === 'loading' ? (
          <SkeletonGroup label={t('state.loading')}>
            <div className="flex flex-col gap-3.5">
              {[0, 1, 2].map((group) => (
                <div key={group}>
                  <Skeleton className="mb-2 h-4 w-24 rounded-md" />
                  <Skeleton className="h-[100px] rounded-card-sm" />
                </div>
              ))}
            </div>
          </SkeletonGroup>
        ) : null}

        {settings.status === 'error' ? (
          <ErrorState
            title={t('state.errorTitle')}
            body={t('state.errorBody')}
            retryLabel={t('state.retry')}
            onRetry={settings.retry}
          />
        ) : null}

        {settings.status === 'ready' ? <SettingsContent settings={settings.value} /> : null}
      </div>
    </>
  );
}

type Editing =
  | 'goal'
  | 'waterEvery'
  | 'pace'
  | 'types'
  | 'block'
  | 'customBlock'
  | 'focusGoal'
  | 'hours'
  | 'days'
  | 'theme'
  | 'language'
  | 'erase'
  | null;

const AUTO = 'auto';
const CUSTOM = 'custom';

const IMPORT_MESSAGES = {
  'not-healthywork': 'data.importNotHealthywork',
  'newer-version': 'data.importNewer',
  'invalid-data': 'data.importInvalid',
  unreadable: 'data.importUnreadable',
} as const satisfies Record<ImportProblem, string>;

function SettingsContent({ settings }: { settings: Settings }) {
  const { t, i18n } = useTranslation('settings');
  const { t: tc } = useTranslation();
  const store = useDataStore();
  const show = useToasts((state) => state.show);
  const formatDuration = useFormatDuration();
  const [editing, setEditing] = useState<Editing>(null);
  const [pendingImport, setPendingImport] = useState<{ file: unknown; data: BackupData } | null>(
    null,
  );
  const fileInput = useRef<HTMLInputElement>(null);
  const close = () => setEditing(null);
  const number = (value: number) => formatNumber(value, i18n.language);
  const save = store.settings.update;
  const sheet = { onClose: close, saveLabel: t('save'), cancelLabel: tc('actions.cancel') };

  const { water, breaks, focus, workday, appearance } = settings;
  const paceLabel = (every: number) =>
    t(every === RECOMMENDED_PACE_MIN ? 'breaks.paceRecommended' : 'breaks.paceValue', {
      rest: breaks.durationMin,
      every,
    });
  const blockLabel = (focusMin: number, breakMin: number) =>
    t('focus.blockValue', { focus: focusMin, rest: breakMin });
  const preset = PRESETS.find(
    (p) => p.focusMin === focus.focusMin && p.breakMin === focus.breakMin,
  );
  const themeLabel = (theme: ThemePreference) =>
    t(
      theme === 'system'
        ? 'appearance.themeSystem'
        : theme === 'light'
          ? 'appearance.themeLight'
          : 'appearance.themeDark',
    );
  const days = summarizeDays(workday.days);
  const daysLabel =
    days.kind === 'weekdays'
      ? t('workday.weekdays')
      : days.kind === 'everyDay'
        ? t('workday.everyDay')
        : days.kind === 'none'
          ? t('workday.noDays')
          : t('workday.daysCount', { count: days.count });

  const exportData = async () => {
    const now = systemClock();
    downloadBackup(await store.exportBackup(now), now);
    show({ message: t('data.exported') });
  };

  const chooseFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    // Clearing the field lets the same file be chosen again after an error.
    event.target.value = '';
    if (!file) return;
    const result = await readBackupFile(file);
    if (result.ok) setPendingImport({ file: result.file, data: result.data });
    else show({ kind: 'notice', message: t(IMPORT_MESSAGES[result.problem]), durationMs: 8000 });
  };

  const importData = async () => {
    if (!pendingImport) return;
    try {
      await store.importBackup(pendingImport.file);
      show({ message: t('data.imported') });
    } catch {
      show({ kind: 'notice', message: t('data.importInvalid'), durationMs: 8000 });
    }
  };

  const eraseEverything = async () => {
    await store.clearAll();
    // The theme and language mirror goes back to its defaults too.
    writeBootPrefs('system', null);
    show({ message: t('data.erased') });
  };

  return (
    <>
      <SettingsGroup title={tc('modules.water')} tone="water">
        <SettingsValueRow
          label={t('water.goal')}
          value={t('water.goalValue', { amount: number(water.goalMl) })}
          onClick={() => setEditing('goal')}
        />
        <SettingsValueRow
          label={t('water.every')}
          value={t('water.everyValue', { minutes: water.reminderEveryMin })}
          onClick={() => setEditing('waterEvery')}
        />
      </SettingsGroup>

      <SettingsGroup title={tc('modules.breaks')} tone="move">
        <SettingsValueRow
          label={t('breaks.pace')}
          value={paceLabel(breaks.everyMin)}
          onClick={() => setEditing('pace')}
        />
        <SettingsValueRow
          label={t('breaks.types')}
          value={t('breaks.typesValue', { count: breaks.types.length })}
          onClick={() => setEditing('types')}
        />
      </SettingsGroup>

      <SettingsGroup title={tc('modules.focus')} tone="focus">
        <SettingsValueRow
          label={t('focus.block')}
          value={blockLabel(focus.focusMin, focus.breakMin)}
          onClick={() => setEditing('block')}
        />
        <SettingsValueRow
          label={t('focus.goal')}
          value={formatDuration(focus.dailyGoalMin)}
          onClick={() => setEditing('focusGoal')}
        />
      </SettingsGroup>

      <SettingsGroup title={t('workday.title')}>
        <SettingsValueRow
          label={t('workday.hours')}
          value={t('workday.hoursValue', { start: workday.start, end: workday.end })}
          onClick={() => setEditing('hours')}
        />
        <SettingsValueRow
          label={t('workday.days')}
          value={daysLabel}
          onClick={() => setEditing('days')}
        />
      </SettingsGroup>

      <NotificationSettings settings={settings.notifications} />

      <SettingsGroup title={t('appearance.title')}>
        <SettingsValueRow
          label={t('appearance.theme')}
          value={themeLabel(appearance.theme)}
          onClick={() => setEditing('theme')}
        />
        <SettingsValueRow
          label={t('appearance.language')}
          value={
            appearance.language ? LANGUAGE_NAMES[appearance.language] : t('appearance.languageAuto')
          }
          onClick={() => setEditing('language')}
        />
      </SettingsGroup>

      <InstallSettings />

      <div className="flex flex-col gap-1.5">
        <SettingsGroup title={t('data.title')}>
          <SettingsValueRow
            opensDialog={false}
            label={t('data.export')}
            value={t('data.exportValue')}
            onClick={() => void exportData()}
          />
          <SettingsValueRow
            opensDialog={false}
            label={t('data.import')}
            onClick={() => fileInput.current?.click()}
          />
          <SettingsValueRow danger label={t('data.erase')} onClick={() => setEditing('erase')} />
        </SettingsGroup>
        <p className="px-1 pt-0.5 text-[13px] text-ink-2">{t('data.privacy')}</p>
        <input
          ref={fileInput}
          type="file"
          accept="application/json,.json"
          aria-label={t('data.import')}
          tabIndex={-1}
          className="sr-only"
          onChange={(event) => void chooseFile(event)}
        />
      </div>

      <Card
        variant="soft"
        tone="water"
        radius="notice"
        className="px-4 py-3.5 text-[13px] leading-normal"
      >
        {tc('disclaimer')}
      </Card>

      <WaterGoalSheet
        open={editing === 'goal'}
        onClose={close}
        goalMl={water.goalMl}
        onSave={(goalMl) => void save({ water: { goalMl } })}
      />
      <ChoiceSheet
        {...sheet}
        open={editing === 'waterEvery'}
        title={t('water.every')}
        body={t('water.everyBody')}
        value={String(water.reminderEveryMin)}
        choices={WATER_INTERVALS_MIN.map((minutes) => ({
          value: String(minutes),
          label: t('water.everyValue', { minutes }),
        }))}
        onSave={(value) => void save({ water: { reminderEveryMin: Number(value) } })}
      />
      <ChoiceSheet
        {...sheet}
        tone="move"
        open={editing === 'pace'}
        title={t('breaks.pace')}
        body={t('breaks.paceBody')}
        value={String(breaks.everyMin)}
        choices={BREAK_PACES_MIN.map((every) => ({
          value: String(every),
          label: t('breaks.paceValue', { rest: breaks.durationMin, every }),
          detail: every === RECOMMENDED_PACE_MIN ? t('breaks.recommended') : undefined,
        }))}
        onSave={(value) => void save({ breaks: { everyMin: Number(value) } })}
      />
      <BreakTypesSheet
        open={editing === 'types'}
        onClose={close}
        types={breaks.types}
        onSave={(types) => void save({ breaks: { types } })}
      />
      <ChoiceSheet
        {...sheet}
        tone="focus"
        open={editing === 'block'}
        title={t('focus.block')}
        body={t('focus.blockBody')}
        value={preset ? `${preset.focusMin}-${preset.breakMin}` : CUSTOM}
        choices={[
          ...PRESETS.map((p) => ({
            value: `${p.focusMin}-${p.breakMin}`,
            label: blockLabel(p.focusMin, p.breakMin),
          })),
          {
            value: CUSTOM,
            label: t('focus.custom'),
            detail: preset ? undefined : blockLabel(focus.focusMin, focus.breakMin),
          },
        ]}
        onSave={(value) => {
          const chosen = PRESETS.find((p) => `${p.focusMin}-${p.breakMin}` === value);
          if (chosen)
            void save({ focus: { focusMin: chosen.focusMin, breakMin: chosen.breakMin } });
          // "Other" continues in the sheet that asks for the two lengths.
          else window.setTimeout(() => setEditing('customBlock'), 0);
        }}
      />
      <CustomBlockSheet
        open={editing === 'customBlock'}
        onClose={close}
        focusMin={focus.focusMin}
        breakMin={focus.breakMin}
        onSave={(focusMin, breakMin) => void save({ focus: { focusMin, breakMin } })}
      />
      <ChoiceSheet
        {...sheet}
        tone="focus"
        open={editing === 'focusGoal'}
        title={t('focus.goal')}
        body={t('focus.goalBody')}
        value={String(focus.dailyGoalMin)}
        choices={[...new Set([...FOCUS_GOALS_MIN, focus.dailyGoalMin])]
          .sort((a, b) => a - b)
          .map((minutes) => ({ value: String(minutes), label: formatDuration(minutes) }))}
        onSave={(value) => void save({ focus: { dailyGoalMin: Number(value) } })}
      />
      <WorkHoursSheet
        open={editing === 'hours'}
        onClose={close}
        workday={workday}
        onSave={(hours) => void save({ workday: hours })}
      />
      <WorkDaysSheet
        open={editing === 'days'}
        onClose={close}
        days={workday.days}
        onSave={(next) => void save({ workday: { days: next } })}
      />
      <ChoiceSheet<ThemePreference>
        {...sheet}
        open={editing === 'theme'}
        title={t('appearance.theme')}
        value={appearance.theme}
        choices={THEME_PREFERENCES.map((theme) => ({ value: theme, label: themeLabel(theme) }))}
        onSave={(theme) => void save({ appearance: { theme } })}
      />
      <ChoiceSheet<Language | typeof AUTO>
        {...sheet}
        open={editing === 'language'}
        title={t('appearance.language')}
        value={appearance.language ?? AUTO}
        choices={[
          { value: AUTO, label: t('appearance.languageAuto') },
          ...LANGUAGES.map((language) => ({ value: language, label: LANGUAGE_NAMES[language] })),
        ]}
        onSave={(value) => void save({ appearance: { language: value === AUTO ? null : value } })}
      />

      <ConfirmSheet
        open={pendingImport !== null}
        onClose={() => setPendingImport(null)}
        title={t('data.importTitle')}
        body={t('data.importBody')}
        confirmLabel={t('data.importConfirm')}
        cancelLabel={tc('actions.cancel')}
        onConfirm={() => void importData()}
      >
        {pendingImport ? (
          <p className="rounded-2xl bg-bg px-4 py-3 text-sm">
            {t('data.importSummary', {
              water: number(pendingImport.data.water.length),
              breaks: number(pendingImport.data.breaks.length),
              focus: number(pendingImport.data.focus.length),
            })}
          </p>
        ) : null}
      </ConfirmSheet>
      <ConfirmSheet
        open={editing === 'erase'}
        onClose={close}
        title={t('data.eraseTitle')}
        body={t('data.eraseBody')}
        confirmLabel={t('data.eraseConfirm')}
        cancelLabel={tc('actions.cancel')}
        onConfirm={() => void eraseEverything()}
      />
    </>
  );
}
