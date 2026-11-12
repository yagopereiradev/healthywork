/**
 * Runs `task` while holding a lock shared by every open tab of the app, so two
 * tabs never do the same one-off thing at once (finishing the same focus block
 * twice, say). The task should re-read the state it depends on first: by the
 * time it gets the lock, another tab may already have done the work.
 *
 * Without the Web Locks API the task simply runs.
 */
export async function withLock<T>(name: string, task: () => Promise<T>): Promise<T> {
  if (!('locks' in navigator)) return task();
  return navigator.locks.request(name, task) as Promise<T>;
}
