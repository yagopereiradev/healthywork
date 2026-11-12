import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useDataStore } from '@/data/hooks';
import { systemClock } from '@/lib/clock';
import { useToasts } from '@/ui/toast/toastStore';

/**
 * Logs a break the person took on their own ("I took a break"). The app does
 * not know what they did or for how long, so the record carries neither. The
 * toast can undo it.
 */
export function useLogBreak(): () => Promise<void> {
  const store = useDataStore();
  const { t } = useTranslation('breaks');
  const { t: tc } = useTranslation();
  const show = useToasts((state) => state.show);

  return useCallback(async () => {
    try {
      const entry = await store.breaks.add({
        at: systemClock(),
        type: null,
        durationSec: 0,
        origin: 'manual',
      });

      show({
        message: t('toast.logged'),
        action: { label: tc('actions.undo'), run: () => void store.breaks.remove(entry.id) },
      });
    } catch {
      show({ kind: 'notice', message: tc('toasts.saveFailed') });
    }
  }, [store, show, t, tc]);
}
