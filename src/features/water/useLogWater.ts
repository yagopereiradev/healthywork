import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useDataStore } from '@/data/hooks';
import type { DrinkType } from '@/data/types';
import { systemClock } from '@/lib/clock';
import { dayKey } from '@/lib/dates';
import { formatNumber } from '@/lib/format';
import { requestPersistentStorage } from '@/lib/storage-persistence';
import { useToasts } from '@/ui/toast/toastStore';
import { crossesGoal, DEFAULT_AMOUNT_ML, totalMl } from './domain/water';

/** Session key that remembers the day the goal was celebrated, so it happens once a day. */
const CELEBRATED_KEY = 'water-goal-celebrated';

/**
 * Logs a drink and confirms it with a toast that can undo it. The record that
 * takes the day over the goal gets one quiet extra notice, once per day.
 */
export function useLogWater(): (amountMl?: number, drink?: DrinkType) => Promise<void> {
  const store = useDataStore();
  const { t, i18n } = useTranslation('water');
  const { t: tc } = useTranslation();
  const show = useToasts((state) => state.show);

  return useCallback(
    async (amountMl = DEFAULT_AMOUNT_ML, drink: DrinkType = 'water') => {
      try {
        const now = systemClock();
        const today = dayKey(now);
        const [settings, before] = await Promise.all([
          store.settings.get(),
          store.water.listBetween(today, today),
        ]);
        const entry = await store.water.add({ at: now, amountMl, drink });

        show({
          message: t('toast.logged', { amount: formatNumber(amountMl, i18n.language) }),
          action: { label: tc('actions.undo'), run: () => void store.water.remove(entry.id) },
        });

        if (crossesGoal(totalMl(before), amountMl, settings.water.goalMl)) {
          const celebrated = await store.session.get<string>(CELEBRATED_KEY);
          if (celebrated !== today) {
            await store.session.set(CELEBRATED_KEY, today);
            show({ message: t('toast.goal') });
          }
        }

        // The first record is a good moment to ask the browser to keep the data.
        void requestPersistentStorage();
      } catch {
        show({ kind: 'notice', message: tc('toasts.saveFailed') });
      }
    },
    [store, show, t, tc, i18n.language],
  );
}
