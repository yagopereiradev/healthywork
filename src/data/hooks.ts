import { use, useCallback, useEffect, useMemo, useState, type DependencyList } from 'react';
import { DataStoreContext } from './context';
import type { Settings } from './settings';
import type { DataStore, Live } from './store';

export function useDataStore(): DataStore {
  const store = use(DataStoreContext);
  if (!store) throw new Error('useDataStore must be used inside <DataStoreProvider>');
  return store;
}

export type LiveState<T> =
  | { status: 'loading'; value?: undefined }
  | { status: 'ready'; value: T }
  | { status: 'error'; value?: undefined; error: unknown };

export type LiveResult<T> = LiveState<T> & { retry: () => void };

/**
 * Subscribes to a Live value for as long as the component is mounted.
 *
 * The three states map to the three things a screen must draw: a skeleton
 * while loading, the content, or an error with a "try again" action (`retry`).
 */
export function useLive<T>(source: () => Live<T>, deps: DependencyList): LiveResult<T> {
  const [attempt, setAttempt] = useState(0);
  // A fresh token identifies the current subscription, so a result that belongs
  // to previous deps is never shown for the new ones.
  // eslint-disable-next-line react-hooks/exhaustive-deps, react-hooks/use-memo
  const token = useMemo(() => ({}), [...deps, attempt]);
  const [result, setResult] = useState<{ token: object; state: LiveState<T> } | null>(null);

  useEffect(() => {
    return source().subscribe(
      (value) => setResult({ token, state: { status: 'ready', value } }),
      (error) => setResult({ token, state: { status: 'error', error } }),
    );
    // `source` is intentionally not a dependency: callers pass an inline
    // function and list what it depends on in `deps`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);
  const state: LiveState<T> = result?.token === token ? result.state : { status: 'loading' };
  return { ...state, retry };
}

export function useSettings(): LiveResult<Settings> {
  const store = useDataStore();
  return useLive(() => store.settings.watch(), [store]);
}
