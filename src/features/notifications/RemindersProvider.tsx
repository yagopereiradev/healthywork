import { useCallback, useEffect, useMemo, useRef, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useDataStore, useLive, useSettings } from '@/data/hooks';
import type { BreakType } from '@/data/types';
import { suggestBreakType } from '@/features/breaks/domain/breaks';
import { exerciseDurationSec } from '@/features/breaks/domain/exercises';
import { holdBreaksUntil, type FocusState } from '@/features/focus/domain/timer';
import { FOCUS_STATE_KEY } from '@/features/focus/focusContext';
import { DEFAULT_AMOUNT_ML, goalProgress, totalMl } from '@/features/water/domain/water';
import { useLogWater } from '@/features/water/useLogWater';
import { systemClock } from '@/lib/clock';
import { dayKey } from '@/lib/dates';
import { formatNumber } from '@/lib/format';
import { playSound, unlockSound } from '@/lib/sound';
import { useLeader } from '@/lib/useLeader';
import { useNow } from '@/lib/useNow';
import { withLock } from '@/lib/withLock';
import { useToasts } from '@/ui/toast/toastStore';
import {
  advance,
  dismiss,
  dueAt,
  endMeeting,
  promptBreakNow,
  reconcile,
  snooze,
  SNOOZE_MINUTES,
  startMeeting,
  type ReminderContext,
  type ReminderKind,
  type ReminderState,
} from './domain/reminders';
import { RemindersContext, type RemindersValue } from './remindersContext';
import {
  closeReminderNotification,
  REMINDER_ACTION_MESSAGE,
  showReminderNotification,
  type ReminderActionMessage,
} from './systemNotifications';

const STATE_KEY = 'reminders';
/** Held by whoever is writing the reminder state, across every open tab. */
const STATE_LOCK = 'healthywork-reminder-state';
/** How often the engine looks at the clock. Reminders are precise to this, which is plenty. */
const TICK_MS = 10_000;
const MINUTE = 60_000;

/**
 * Runs the reminder engine and shares its state with the screens.
 *
 * The rules live in domain/reminders.ts. This component is the part that
 * touches the world: it reads the clock and the day's records, saves the
 * engine's state, and when a reminder comes due it plays the sound and shows
 * the notification. Only one open tab does those two things.
 */
export function RemindersProvider({ children }: { children: ReactNode }) {
  const store = useDataStore();
  const { t, i18n } = useTranslation('reminders');
  const { t: tb } = useTranslation('breaks');
  const { t: tc } = useTranslation();
  const show = useToasts((state) => state.show);
  const logWater = useLogWater();
  const leader = useLeader('healthywork-reminders');

  const now = useNow(TICK_MS);
  const today = dayKey(now);
  const settings = useSettings();
  const water = useLive(() => store.water.watchDay(today), [store, today]);
  const breaks = useLive(() => store.breaks.watchDay(today), [store, today]);
  const stored = useLive(() => store.session.watch<ReminderState>(STATE_KEY), [store]);
  const focus = useLive(() => store.session.watch<FocusState>(FOCUS_STATE_KEY), [store]);

  const context = useMemo<ReminderContext | null>(() => {
    if (settings.status !== 'ready' || water.status !== 'ready' || breaks.status !== 'ready') {
      return null;
    }
    return {
      now,
      settings: settings.value,
      waterTotalMl: totalMl(water.value),
      lastDrinkAt: water.value.at(-1)?.at ?? null,
      lastBreakAt: breaks.value.at(-1)?.at ?? null,
      nextBreakType: suggestBreakType(breaks.value.length, settings.value.breaks.types),
      // While a focus block runs, the movement reminder waits for its end.
      holdBreaksUntil: holdBreaksUntil(focus.value, now),
    };
  }, [
    now,
    settings.status,
    settings.value,
    water.status,
    water.value,
    breaks.status,
    breaks.value,
    focus.value,
  ]);

  const storedState = stored.status === 'ready' ? stored.value : undefined;
  const storedReady = stored.status === 'ready';
  const state = useMemo(
    () => (context && storedReady ? reconcile(storedState, context) : null),
    [context, storedReady, storedState],
  );

  // The engine: move the state forward, save it if it changed, announce what came due.
  const announce = useRef<(kind: ReminderKind, state: ReminderState) => void>(() => {});
  useEffect(() => {
    if (!context || !storedReady || !leader) return;
    // A cheap look at what this component already has: most ticks change nothing.
    if (advance(storedState, context).state === storedState) return;
    // Something is due. Decide again on what is actually saved, one writer at a
    // time: the copy held here can be a moment behind (a break just opened by
    // the focus timer, an answer given in another tab), and acting on it would
    // open a second reminder over the first.
    void withLock(STATE_LOCK, async () => {
      const saved = await store.session.get<ReminderState>(STATE_KEY);
      const result = advance(saved, context);
      if (result.state !== saved) await store.session.set(STATE_KEY, result.state);
      for (const kind of result.fired) announce.current(kind, result.state);
    });
  }, [context, storedReady, storedState, leader, store]);

  useEffect(() => {
    announce.current = (kind, fired) => {
      const prefs = settings.value?.notifications;
      if (!context || !prefs) return;

      if (prefs.sound) playSound(kind === 'water' ? 'water' : 'break', prefs.volume);

      // The app already shows the reminder when it is in front of the person.
      const inFront = document.visibilityState === 'visible' && document.hasFocus();
      if (!prefs.system || inFront) return;

      if (kind === 'water') {
        const remaining = goalProgress(context.waterTotalMl, context.settings.water.goalMl);
        void showReminderNotification({
          kind,
          title: t('water.title'),
          body: t('water.body', { amount: formatNumber(remaining.remainingMl, i18n.language) }),
          actions: [
            {
              action: 'log',
              title: t('water.log', { amount: formatNumber(DEFAULT_AMOUNT_ML, i18n.language) }),
            },
            { action: 'snooze', title: t('water.snooze') },
          ],
        });
      } else if (fired.prompts.breaks) {
        void showReminderNotification({
          kind,
          title: t('break.title'),
          body: tb(`exercises.${fired.prompts.breaks.type}.title`),
          actions: [{ action: 'snooze', title: tb('screen.snooze') }],
        });
      }
    };
  });

  // Sound needs one interaction with the page before the browser allows it.
  useEffect(() => {
    const unlock = () => unlockSound();
    window.addEventListener('pointerdown', unlock, { once: true });
    window.addEventListener('keydown', unlock, { once: true });
    return () => {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
  }, []);

  // A reminder answered in the app takes its notification away too.
  const waterPrompted = Boolean(state?.prompts.water);
  const breakPrompted = Boolean(state?.prompts.breaks);
  useEffect(() => {
    if (!waterPrompted) void closeReminderNotification('water');
  }, [waterPrompted]);
  useEffect(() => {
    if (!breakPrompted) void closeReminderNotification('breaks');
  }, [breakPrompted]);

  // The tab title says a reminder is waiting, for when the tab is in the background.
  const promptTitle = state?.prompts.breaks
    ? t('break.title')
    : state?.prompts.water
      ? t('water.title')
      : null;
  useEffect(() => {
    document.title = promptTitle ? `${promptTitle} · HealthyWork` : 'HealthyWork';
  }, [promptTitle]);

  /** Applies a change to the freshest saved state, one writer at a time. */
  const update = useCallback(
    async (change: (current: ReminderState, at: number) => ReminderState) => {
      if (!context) return;
      // The moment of the tap, read before anything asynchronous.
      const at = systemClock();
      await withLock(STATE_LOCK, async () => {
        const current = reconcile(await store.session.get<ReminderState>(STATE_KEY), {
          ...context,
          now: at,
        });
        await store.session.set(STATE_KEY, change(current, at));
      });
    },
    [context, store],
  );

  const value = useMemo<RemindersValue | null>(() => {
    if (!context || !state || settings.status !== 'ready') return null;
    const current = settings.value;

    return {
      state,
      context,
      settings: current,

      snoozeBreak: async () => {
        await update((s, at) => snooze(s, 'breaks', at));
        show({ kind: 'notice', message: tb('toast.snoozed') });
      },
      skipBreak: () => update((s, at) => dismiss(s, 'breaks', at)),
      completeBreak: async () => {
        const prompt = state.prompts.breaks;
        if (!prompt) return;
        const entry = await store.breaks.add({
          at: systemClock(),
          type: prompt.type,
          durationSec:
            prompt.focusBreakMin === undefined
              ? exerciseDurationSec(prompt.type, current.breaks.durationMin)
              : prompt.focusBreakMin * 60,
          origin: prompt.focusBreakMin === undefined ? 'reminder' : 'focus',
        });
        await update((s) => ({ ...s, prompts: { ...s.prompts, breaks: null } }));
        show({
          message: tb('toast.done'),
          action: { label: tc('actions.undo'), run: () => void store.breaks.remove(entry.id) },
        });
      },
      startBreakNow: (type: BreakType, focusBreakMin?: number) =>
        update((s, at) => promptBreakNow(s, type, at, focusBreakMin)),
      postponeNextBreak: async () => {
        await update((s, at) => {
          const due = dueAt('breaks', s, { ...context, now: at }) ?? at;
          const minutes = Math.max(0, (due - at) / MINUTE) + SNOOZE_MINUTES;
          return snooze(s, 'breaks', at, minutes);
        });
        show({ kind: 'notice', message: tb('toast.snoozed') });
      },

      snoozeWater: async () => {
        await update((s, at) => snooze(s, 'water', at));
        show({ kind: 'notice', message: t('water.snoozed') });
      },
      dismissWater: () => update((s, at) => dismiss(s, 'water', at)),

      startMeeting: (minutes) => update((s, at) => startMeeting(s, at, minutes)),
      endMeeting: async () => {
        await update((s) => endMeeting(s));
        show({ kind: 'notice', message: t('meeting.ended') });
      },
    };
  }, [context, state, settings.status, settings.value, update, show, store, t, tb, tc]);

  // Buttons on a system notification arrive here through the service worker.
  const latest = useRef(value);
  useEffect(() => {
    latest.current = value;
  });
  useEffect(() => {
    const worker = navigator.serviceWorker;
    if (!worker) return;
    const onMessage = (event: MessageEvent) => {
      const message = event.data as Partial<ReminderActionMessage> | null;
      if (message?.type !== REMINDER_ACTION_MESSAGE) return;
      if (message.kind === 'water' && message.action === 'log') void logWater();
      if (message.kind === 'water' && message.action === 'snooze')
        void latest.current?.snoozeWater();
      if (message.kind === 'breaks' && message.action === 'snooze')
        void latest.current?.snoozeBreak();
    };
    worker.addEventListener('message', onMessage);
    return () => worker.removeEventListener('message', onMessage);
  }, [logWater]);

  return <RemindersContext value={value}>{children}</RemindersContext>;
}
