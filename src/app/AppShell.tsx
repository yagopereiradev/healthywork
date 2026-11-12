import { Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, NavLink, Outlet, useLocation } from 'react-router';
import { FocusProvider } from '@/features/focus/FocusProvider';
import { RemindersProvider } from '@/features/notifications/RemindersProvider';
import { ReminderSurfaces } from '@/features/notifications/ui/ReminderSurfaces';
import { WaterBanner } from '@/features/notifications/ui/WaterBanner';
import { Button } from '@/ui/Button';
import { cn } from '@/ui/cn';
import { Logo } from '@/ui/Logo';
import { TONES } from '@/ui/tones';
import { NAV_ITEMS } from './navigation';
import { usePwaStore } from './pwaStore';
import { GlobalShortcuts } from './GlobalShortcuts';

/**
 * The frame around every screen. One <nav>, three shapes:
 *   phone             tab bar fixed at the bottom
 *   narrow window     bar across the top (md)
 *   wide window       sidebar with logo and the install invitation (lg)
 */
export function AppShell() {
  const { t } = useTranslation();
  const { pathname } = useLocation();

  return (
    <RemindersProvider>
      <FocusProvider>
        <div className="min-h-dvh lg:flex">
          <a
            href="#main"
            className="sr-only focus-visible:not-sr-only focus-visible:fixed focus-visible:top-3 focus-visible:left-3 focus-visible:z-50 focus-visible:rounded-control focus-visible:bg-inverse focus-visible:px-4 focus-visible:py-3 focus-visible:text-sm focus-visible:font-semibold focus-visible:text-inverse-on"
          >
            {t('nav.skip')}
          </a>

          <AppNav />
          <GlobalShortcuts />
          <ReminderSurfaces />

          <main
            id="main"
            tabIndex={-1}
            className="min-w-0 flex-1 px-5 pt-7 pb-28 outline-none md:px-8 md:py-8"
          >
            <div className="mx-auto flex max-w-[1120px] flex-col gap-3.5 md:gap-6">
              <UpdateBanner />
              <WaterBanner />
              {/* Keyed by address, so each screen fades in as it arrives. */}
              <div key={pathname} className="hw-screen flex flex-col gap-3.5 md:gap-6">
                <Suspense fallback={null}>
                  <Outlet />
                </Suspense>
              </div>
            </div>
          </main>
        </div>
      </FocusProvider>
    </RemindersProvider>
  );
}

function AppNav() {
  const { t } = useTranslation();

  return (
    <nav
      aria-label={t('nav.label')}
      className={cn(
        'fixed inset-x-0 bottom-0 z-30 border-t border-line bg-bg px-5 pt-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))]',
        'md:sticky md:top-0 md:bottom-auto md:flex md:items-center md:justify-between md:gap-6 md:border-t-0 md:border-b md:border-divider md:bg-surface md:px-8 md:py-3',
        'lg:h-dvh lg:w-60 lg:shrink-0 lg:flex-col lg:items-stretch lg:justify-start lg:border-r lg:border-b-0 lg:px-5 lg:py-7',
      )}
    >
      <Link to="/" aria-label="HealthyWork" className="hidden rounded-control text-xl md:block">
        <Logo />
      </Link>

      <ul className="grid grid-cols-4 gap-1 md:flex lg:flex-col">
        {NAV_ITEMS.map((item) => (
          <li key={item.to}>
            <NavLink
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                cn(
                  'flex min-h-11 items-center justify-center rounded-control px-3.5 text-[13px] transition-colors duration-150 md:text-sm lg:justify-start lg:text-[15px]',
                  isActive
                    ? cn('font-semibold', TONES[item.tone].soft, TONES[item.tone].ink)
                    : 'font-medium text-ink-2 hover:text-ink',
                )
              }
            >
              {t(`nav.${item.label}`)}
            </NavLink>
          </li>
        ))}
      </ul>

      <InstallInvite />
    </nav>
  );
}

/** Shown in the sidebar while the browser offers to install the app. */
function InstallInvite() {
  const { t } = useTranslation();
  const available = usePwaStore((state) => state.installPrompt !== null);
  const install = usePwaStore((state) => state.install);

  if (!available) return null;

  return (
    <div className="mt-auto hidden flex-col gap-2.5 rounded-2xl bg-bg p-3.5 lg:flex">
      <p className="text-[13px] leading-[1.45] text-ink-2">{t('install.pitch')}</p>
      <Button variant="outline" onClick={() => void install()}>
        {t('install.action')}
      </Button>
    </div>
  );
}

function UpdateBanner() {
  const { t } = useTranslation();
  const ready = usePwaStore((state) => state.updateReady);
  const applyUpdate = usePwaStore((state) => state.applyUpdate);

  if (!ready) return null;

  return (
    <div
      role="status"
      className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-inverse py-1.5 pr-1.5 pl-4 text-[15px] font-semibold text-inverse-on"
    >
      {t('update.message')}
      <button
        type="button"
        onClick={applyUpdate}
        className="min-h-11 rounded-control bg-inverse-raised px-3.5 text-sm font-semibold text-inverse-accent"
      >
        {t('update.action')}
      </button>
    </div>
  );
}
