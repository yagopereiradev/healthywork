import type { ReactNode } from 'react';
import { DataStoreContext } from './context';
import type { DataStore } from './store';

export function DataStoreProvider({ store, children }: { store: DataStore; children: ReactNode }) {
  return <DataStoreContext value={store}>{children}</DataStoreContext>;
}
