import type { ReminderKind } from './domain/reminders';

/**
 * System notifications for reminders. They go through the service worker when
 * there is one (the installed app, the production site), which is what lets
 * them carry action buttons. Without it (development), the plain Notification
 * API is used. The app plays its own sound, so notifications are silent.
 */
export type NotificationPermissionState = 'granted' | 'denied' | 'default' | 'unsupported';

/** The message a notification click sends from the service worker to the page. */
export const REMINDER_ACTION_MESSAGE = 'hw-reminder-action';
export interface ReminderActionMessage {
  type: typeof REMINDER_ACTION_MESSAGE;
  kind: ReminderKind;
  /** 'open' for a click on the notification itself. */
  action: 'open' | 'log' | 'snooze';
}

export interface ReminderNotification {
  kind: ReminderKind;
  title: string;
  body: string;
  actions?: { action: ReminderActionMessage['action']; title: string }[];
}

const tagOf = (kind: ReminderKind) => `hw-${kind}`;

export function notificationPermission(): NotificationPermissionState {
  return 'Notification' in window ? Notification.permission : 'unsupported';
}

/** Must be called from a click: browsers ignore it otherwise. */
export async function requestNotificationPermission(): Promise<NotificationPermissionState> {
  if (!('Notification' in window)) return 'unsupported';
  try {
    return await Notification.requestPermission();
  } catch {
    return notificationPermission();
  }
}

async function registration(): Promise<ServiceWorkerRegistration | undefined> {
  try {
    return await navigator.serviceWorker?.getRegistration();
  } catch {
    return undefined;
  }
}

/** Shows the notification if the person allowed them. Returns whether it was shown. */
export async function showReminderNotification(reminder: ReminderNotification): Promise<boolean> {
  if (notificationPermission() !== 'granted') return false;

  const options = {
    body: reminder.body,
    tag: tagOf(reminder.kind),
    icon: `${import.meta.env.BASE_URL}pwa-192x192.png`,
    silent: true,
    data: { kind: reminder.kind },
  };

  try {
    const worker = await registration();
    if (worker?.active) {
      // `actions` is part of the standard but missing from the DOM typings.
      await worker.showNotification(reminder.title, {
        ...options,
        actions: reminder.actions,
      } as NotificationOptions);
    } else {
      const notification = new Notification(reminder.title, options);
      notification.onclick = () => {
        window.focus();
        notification.close();
      };
    }
    return true;
  } catch {
    return false;
  }
}

/** Removes a reminder's notification once it has been answered in the app. */
export async function closeReminderNotification(kind: ReminderKind): Promise<void> {
  try {
    const worker = await registration();
    const open = (await worker?.getNotifications({ tag: tagOf(kind) })) ?? [];
    for (const notification of open) notification.close();
  } catch {
    // Nothing to close.
  }
}
