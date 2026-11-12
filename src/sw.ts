/// <reference lib="webworker" />
import { clientsClaim } from 'workbox-core';
import {
  cleanupOutdatedCaches,
  createHandlerBoundToURL,
  precacheAndRoute,
} from 'workbox-precaching';
import { NavigationRoute, registerRoute } from 'workbox-routing';

declare const self: ServiceWorkerGlobalScope;

// The whole app shell is precached: after the first visit it opens offline.
cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST);

// Every in-app URL is served by the same index.html (single-page app).
registerRoute(new NavigationRoute(createHandlerBoundToURL('index.html')));

// A new version waits until the user taps "Update" in the app.
self.addEventListener('message', (event) => {
  if ((event.data as { type?: string } | null)?.type === 'SKIP_WAITING') {
    void self.skipWaiting();
  }
});
clientsClaim();

/**
 * A click on a reminder notification, or on one of its buttons, brings the app
 * to the front and tells it what was chosen. The app does the rest: this file
 * knows nothing about reminders beyond passing the message along.
 * Keep the message shape in step with src/features/notifications/systemNotifications.ts.
 */
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const kind = (event.notification.data as { kind?: string } | null)?.kind;
  const message = { type: 'hw-reminder-action', kind, action: event.action || 'open' };

  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      const target = windows.find((client) => client.focused) ?? windows[0];
      if (target) {
        target.postMessage(message);
        await target.focus();
      } else {
        await self.clients.openWindow(self.registration.scope);
      }
    })(),
  );
});
