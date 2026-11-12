import { render } from '@testing-library/react';
import type { ReactElement } from 'react';
import { MemoryRouter } from 'react-router';
import { DataStoreProvider } from '@/data/DataStoreProvider';
import { HealthyWorkDB } from '@/data/dexie/db';
import { createDexieStore } from '@/data/dexie/dexieStore';
import type { DataStore } from '@/data/store';
import { Toaster } from '@/ui/toast/Toaster';

let counter = 0;

/** A store on its own empty in-memory database. */
export function newTestStore(): DataStore {
  return createDexieStore(new HealthyWorkDB(`hw-ui-test-${++counter}`));
}

/** Renders a screen with what every screen has around it: data, router and toasts. */
export function renderWithApp(ui: ReactElement, { store = newTestStore(), path = '/' } = {}) {
  const result = render(
    <DataStoreProvider store={store}>
      <Toaster label="Notices" />
      <MemoryRouter initialEntries={[path]}>{ui}</MemoryRouter>
    </DataStoreProvider>,
  );
  return { store, ...result };
}
