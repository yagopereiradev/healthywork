import { useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useDataStore } from '@/data/hooks';
import type { Settings } from '@/data/settings';
import { playSound, unlockSound } from '@/lib/sound';
import { Button } from '@/ui/Button';
import { SettingsGroup } from '@/ui/SettingsGroup';
import { SwitchRow } from '@/ui/Switch';
import { notificationPermission, requestNotificationPermission } from '../systemNotifications';

/**
 * Notifications: system notifications (asking the browser for permission when
 * turned on), the reminder sound and its volume.
 */
export function NotificationSettings({ settings }: { settings: Settings['notifications'] }) {
  const { t } = useTranslation('reminders');
  const store = useDataStore();
  const volumeId = useId();
  const [permission, setPermission] = useState(notificationPermission);
  // The slider moves freely; the value is saved when the person lets go.
  const [volume, setVolume] = useState(settings.volume);

  const update = (patch: Partial<Settings['notifications']>) =>
    void store.settings.update({ notifications: patch });

  const toggleSystem = async (on: boolean) => {
    if (!on) return update({ system: false });
    const result = permission === 'granted' ? permission : await requestNotificationPermission();
    setPermission(result);
    if (result === 'granted') update({ system: true });
  };

  return (
    <div className="flex flex-col gap-1.5">
      <SettingsGroup title={t('settings.title')}>
        <SwitchRow
          label={t('settings.system')}
          checked={settings.system && permission === 'granted'}
          disabled={permission === 'unsupported'}
          onChange={(on) => void toggleSystem(on)}
        />
        <SwitchRow
          label={t('settings.sound')}
          checked={settings.sound}
          onChange={(sound) => update({ sound })}
        />
        {settings.sound ? (
          <div className="flex items-center gap-3 px-[18px] py-2">
            <label htmlFor={volumeId} className="text-[15px] font-medium">
              {t('settings.volume')}
            </label>
            <input
              id={volumeId}
              type="range"
              min={0}
              max={100}
              step={5}
              value={Math.round(volume * 100)}
              onChange={(event) => setVolume(Number(event.target.value) / 100)}
              onPointerUp={() => update({ volume })}
              onKeyUp={() => update({ volume })}
              className="min-h-11 min-w-0 flex-1 accent-[var(--hw-water)]"
            />
            <Button
              variant="outline"
              onClick={() => {
                unlockSound();
                playSound('break', volume);
              }}
            >
              {t('settings.test')}
            </Button>
          </div>
        ) : null}
      </SettingsGroup>

      {permission === 'denied' ? (
        <p role="status" className="px-1 text-[13px] text-move-ink">
          {t('settings.denied')}
        </p>
      ) : null}
      {permission === 'unsupported' ? (
        <p className="px-1 text-[13px] text-ink-2">{t('settings.unsupported')}</p>
      ) : null}
      <p className="px-1 text-[13px] text-ink-2">{t('settings.openOnly')}</p>
    </div>
  );
}
