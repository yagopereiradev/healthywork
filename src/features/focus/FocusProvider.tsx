import { useCallback, useEffect, useMemo, useRef, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useDataStore, useLive, useSettings } from '@/data/hooks';
import { useReminders } from '@/features/notifications/remindersContext';
import { showReminderNotification } from '@/features/notifications/systemNotifications';
import { systemClock } from '@/lib/clock';
import { playSound } from '@/lib/sound';
import { withLock } from '@/lib/withLock';
import { useToasts } from '@/ui/toast/toastStore';
import {
  completeBlock,
  isComplete,
  isPaused,
  isStale,
  pause,
  planFrom,
  remainingMs,
  resume,
  startBlock,
  stopBlock,
  type FocusState,
} from './domain/timer';
import { FOCUS_STATE_KEY, FocusContext, type FocusValue } from './focusContext';

const LOCK = 'healthywork-focus';

/**
 * Runs the focus timer and shares it with the screens.
 *
 * The rules are in domain/timer.ts. This component keeps the session saved,
 * notices when a block ends, logs it, plays the sound and opens the break. The
 * break itself belongs to the reminders: a focus block ends by handing over to
 * them.
 */
export function FocusProvider({ children }: { children: ReactNode }) {
  const store = useDataStore();
  const { t } = useTranslation('focus');
  const { t: tb } = useTranslation('breaks');
  const show = useToasts((state) => state.show);
  const settings = useSettings();
  const stored = useLive(() => store.session.watch<FocusState>(FOCUS_STATE_KEY), [store]);
  const reminders = useReminders();

  const state = stored.status === 'ready' ? (stored.value ?? null) : null;
  const ready = stored.status === 'ready' && settings.status === 'ready';

  const save = useCallback(
    (next: FocusState | null) =>
      next ? store.session.set(FOCUS_STATE_KEY, next) : store.session.remove(FOCUS_STATE_KEY),
    [store],
  );
  /** The freshest saved session, in case another tab changed it. */
  const current = useCallback(
    async () => (await store.session.get<FocusState>(FOCUS_STATE_KEY)) ?? null,
    [store],
  );

  // What happens when a block ends reads the latest reminders and settings.
  const latest = useRef({ reminders, settings: settings.value });
  useEffect(() => {
    latest.current = { reminders, settings: settings.value };
  });

  const finish = useCallback(
    () =>
      withLock(LOCK, async () => {
        const now = systemClock();
        const session = await current();
        // Another tab may have finished this block already.
        if (session?.phase !== 'focus' || !isComplete(session, now)) return;

        const { entry, next } = completeBlock(session);
        const { reminders: live, settings: prefs } = latest.current;
        // A block that ended while nobody was looking is logged, and that is all.
        const announce = !isStale(session, now);
        const type = live?.context.nextBreakType;

        await store.focus.add(entry);
        // The break opens before the session moves on. While the finished block
        // is still the saved state, the reminder engine keeps holding its own
        // break back, so there is never a moment in which both would open one.
        if (announce && live && type) await live.startBreakNow(type, session.plan.breakMin);
        await save(next);

        if (!next) {
          show({ message: t('toast.cycleDone', { total: session.plan.blocksPerCycle }) });
        }
        if (!announce) return;
        if (prefs?.notifications.sound) playSound('focus', prefs.notifications.volume);
        if (!type) return;

        const inFront = document.visibilityState === 'visible' && document.hasFocus();
        if (prefs?.notifications.system && !inFront) {
          void showReminderNotification({
            kind: 'breaks',
            title: t('notification.title'),
            body: t('notification.body', { exercise: tb(`exercises.${type}.title`) }),
          });
        }
      }),
    [current, save, show, store, t, tb],
  );

  // Wake up when the running block ends, and check again whenever the tab
  // becomes visible: timers are late in background tabs and after sleep.
  useEffect(() => {
    if (state?.phase !== 'focus' || isPaused(state)) return;
    const check = () => {
      if (isComplete(state, systemClock())) void finish();
    };
    const timer = window.setTimeout(check, remainingMs(state, systemClock()) + 50);
    document.addEventListener('visibilitychange', check);
    check();
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener('visibilitychange', check);
    };
  }, [state, finish]);

  const value = useMemo<FocusValue | null>(() => {
    if (!ready || settings.status !== 'ready') return null;
    const settingsPlan = planFrom(settings.value.focus);

    // Each action reads the clock first, before touching storage: the time
    // that counts is when the person tapped, not when the disk answered.
    const start = async () => {
      const now = systemClock();
      const session = await current();
      if (session?.phase === 'focus') return;
      await save(
        session?.phase === 'ready'
          ? startBlock(session.plan, session.block, now)
          : startBlock(settingsPlan, 1, now),
      );
    };
    const pauseBlock = async () => {
      const now = systemClock();
      const session = await current();
      if (session?.phase === 'focus') await save(pause(session, now));
    };
    const resumeBlock = async () => {
      const now = systemClock();
      const session = await current();
      if (session?.phase === 'focus') await save(resume(session, now));
    };

    return {
      state,
      plan: state?.plan ?? settingsPlan,
      block: state?.block ?? 1,
      start,
      pause: pauseBlock,
      resume: resumeBlock,
      stop: async () => {
        const now = systemClock();
        const session = await current();
        if (!session) return;
        await save(null);
        if (session.phase !== 'focus') return;
        const entry = stopBlock(session, now);
        if (entry) await store.focus.add(entry);
        show({
          kind: 'notice',
          message: entry
            ? t('toast.stoppedLogged', { count: Math.floor(entry.focusedSec / 60) })
            : t('toast.stopped'),
        });
      },
      toggle: async () => {
        const session = await current();
        if (session?.phase !== 'focus') return start();
        return isPaused(session) ? resumeBlock() : pauseBlock();
      },
      choosePlan: async (focusMin, breakMin) => {
        await store.settings.update({ focus: { focusMin, breakMin } });
        const session = await current();
        // A block waiting to start takes the new length too.
        if (session?.phase === 'ready') {
          await save({ ...session, plan: { ...session.plan, focusMin, breakMin } });
        }
      },
    };
  }, [ready, settings.status, settings.value, state, current, save, store, show, t]);

  return <FocusContext value={value}>{children}</FocusContext>;
}
