import { registerSW } from 'virtual:pwa-register';
import { usePwaStore, type BeforeInstallPromptEvent } from './pwaStore';

/**
 * Registers the service worker (production builds only) and listens for the
 * browser's install offer. A new version never reloads the page on its own:
 * the app shows "Update" and the user decides when.
 */
export function registerPwa(): void {
  const updateServiceWorker = registerSW({
    onNeedRefresh() {
      usePwaStore.setState({
        updateReady: true,
        applyUpdate: () => void updateServiceWorker(true),
      });
    },
  });

  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    usePwaStore.setState({ installPrompt: event as BeforeInstallPromptEvent });
  });
  window.addEventListener('appinstalled', () => {
    usePwaStore.setState({ installPrompt: null });
  });
}
