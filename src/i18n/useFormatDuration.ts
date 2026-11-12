import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { splitMinutes } from '@/lib/format';

/** A duration in the words of the current language: "2h55", "4h" or "20 min". */
export function useFormatDuration(): (totalMinutes: number) => string {
  const { t } = useTranslation();
  return useCallback(
    (totalMinutes: number) => {
      const { hours, minutes } = splitMinutes(totalMinutes);
      if (hours === 0) return t('duration.minutes', { minutes });
      if (minutes === 0) return t('duration.hours', { hours });
      return t('duration.hoursMinutes', { hours, minutes: String(minutes).padStart(2, '0') });
    },
    [t],
  );
}
