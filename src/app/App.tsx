import { MotionConfig } from 'motion/react';
import { lazy, Suspense, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router';
import { DataStoreProvider } from '@/data/DataStoreProvider';
import { useSettings } from '@/data/hooks';
import type { DataStore } from '@/data/store';
import { TodayPage } from '@/features/today/ui/TodayPage';
import { Toaster } from '@/ui/toast/Toaster';
import { AppearanceSync } from './AppearanceSync';
import { AppShell } from './AppShell';
import { FocusPage, HistoryPage, Onboarding, SettingsPage, warmUpRoutes } from './lazyRoutes';

// The component gallery only exists in development and never reaches the production bundle.
const DevGallery = import.meta.env.DEV ? lazy(() => import('@/dev/DevGallery')) : null;

/**
 * Until onboarding is done, every address shows it. While the settings load
 * there is nothing to draw yet: the page background is already the right colour.
 */
function FirstRunGate() {
  const settings = useSettings();
  if (settings.status !== 'ready') return null;
  if (settings.value.onboardingDone) return <AppShell />;
  return (
    <Suspense fallback={null}>
      <Onboarding settings={settings.value} />
    </Suspense>
  );
}

// "/" locally, "/<repo>" on GitHub Pages.
const basename = import.meta.env.BASE_URL.replace(/\/$/, '') || '/';

export function App({ store }: { store: DataStore }) {
  const { t } = useTranslation();
  useEffect(warmUpRoutes, []);

  return (
    <DataStoreProvider store={store}>
      {/* Every Motion animation honours prefers-reduced-motion. */}
      <MotionConfig reducedMotion="user">
        <AppearanceSync />
        <Toaster label={t('toasts.region')} />
        <BrowserRouter basename={basename}>
          <Routes>
            <Route element={<FirstRunGate />}>
              <Route index element={<TodayPage />} />
              <Route path="focus" element={<FocusPage />} />
              <Route path="history" element={<HistoryPage />} />
              <Route path="settings" element={<SettingsPage />} />
            </Route>
            {DevGallery ? (
              <Route
                path="dev/ui"
                element={
                  <Suspense fallback={null}>
                    <DevGallery />
                  </Suspense>
                }
              />
            ) : null}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </MotionConfig>
    </DataStoreProvider>
  );
}
