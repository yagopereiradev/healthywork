/**
 * Browsers may evict IndexedDB data from sites that are not "persistent" when
 * the disk runs low, and Safari clears it after seven days without a visit
 * unless the app is installed. Since HealthyWork has no server, the user's
 * history only exists in this storage, so we ask the browser to keep it.
 *
 * Chrome and Edge decide silently (installing the app grants it). Firefox asks
 * the user, so this is requested at a moment that makes sense to them: when
 * they finish onboarding or save their first record, never on first paint.
 */
export async function requestPersistentStorage(): Promise<boolean> {
  try {
    if (!navigator.storage?.persist) return false;
    if (await navigator.storage.persisted()) return true;
    return await navigator.storage.persist();
  } catch {
    return false;
  }
}

export async function isStoragePersistent(): Promise<boolean> {
  try {
    return (await navigator.storage?.persisted?.()) ?? false;
  } catch {
    return false;
  }
}
