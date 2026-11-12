import { useTranslation } from 'react-i18next';
import { usePwaStore } from '@/app/pwaStore';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { installPlatform } from '../domain/options';

/**
 * Installing the app. Chrome and Edge offer it through a button; elsewhere the
 * page says where the browser keeps that option (Safari on a Mac: File, then
 * Add to Dock).
 */
export function InstallSettings() {
  const { t } = useTranslation('settings');
  const canPrompt = usePwaStore((state) => state.installPrompt !== null);
  const install = usePwaStore((state) => state.install);
  const platform = installPlatform(
    navigator.userAgent,
    window.matchMedia('(display-mode: standalone)').matches,
  );

  const hint =
    platform === 'installed'
      ? t('install.installed')
      : platform === 'safari-mac'
        ? t('install.safariMac')
        : platform === 'ios'
          ? t('install.ios')
          : t('install.other');

  return (
    <section className="flex flex-col gap-1.5">
      <h2 className="pl-1 font-sans text-[13px] font-semibold tracking-normal text-ink-2">
        {t('install.title')}
      </h2>
      <Card radius="sm" className="flex flex-col gap-3 px-[18px] py-3.5">
        {platform === 'installed' ? null : (
          <p className="text-[15px] leading-[1.45]">{t('install.pitch')}</p>
        )}
        {canPrompt ? (
          <Button variant="outline" onClick={() => void install()} className="self-start">
            {t('install.row')}
          </Button>
        ) : (
          <p className="text-sm text-ink-2">{hint}</p>
        )}
      </Card>
    </section>
  );
}
