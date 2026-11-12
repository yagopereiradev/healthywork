import { lazy } from 'react';

/**
 * Screens that are not needed for the first paint load on their own. Today is
 * the landing screen and stays in the main bundle; the others arrive when
 * visited, and are warmed up as soon as the browser is idle so moving between
 * screens never waits on the network.
 */
const loaders = {
  focus: () => import('@/features/focus/ui/FocusPage'),
  history: () => import('@/features/history/ui/HistoryPage'),
  settings: () => import('@/features/settings/ui/SettingsPage'),
  onboarding: () => import('@/features/onboarding/ui/Onboarding'),
};

export const FocusPage = lazy(async () => ({ default: (await loaders.focus()).FocusPage }));
export const HistoryPage = lazy(async () => ({ default: (await loaders.history()).HistoryPage }));
export const SettingsPage = lazy(async () => ({
  default: (await loaders.settings()).SettingsPage,
}));
export const Onboarding = lazy(async () => ({ default: (await loaders.onboarding()).Onboarding }));

/** Downloads the other screens in the background, once the first one is on screen. */
export function warmUpRoutes(): void {
  const warm = () => {
    for (const load of Object.values(loaders)) void load().catch(() => {});
  };
  if ('requestIdleCallback' in window) window.requestIdleCallback(warm, { timeout: 4000 });
  else globalThis.setTimeout(warm, 1500);
}
