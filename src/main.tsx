import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app/App';
import { readBootLanguage, readBootTheme } from './app/bootPrefs';
import { buildDemoData, DEMO_DATABASE, DEMO_SEEDED_KEY, detectDemoMode } from './app/demo';
import { registerPwa } from './app/registerPwa';
import { createBackup } from './data/backup';
import { HealthyWorkDB } from './data/dexie/db';
import { createDexieStore } from './data/dexie/dexieStore';
import { initI18n } from './i18n';
import { resolveLanguage } from './i18n/resolveLanguage';
import { systemClock } from './lib/clock';
import { dayKey } from './lib/dates';
import './styles/index.css';

await initI18n(readBootLanguage() ?? resolveLanguage(navigator.languages));
registerPwa();

// Demo mode has its own database: sample data never mixes with real data.
const demo = detectDemoMode(window.location.search, window.sessionStorage);
const store = createDexieStore(demo ? new HealthyWorkDB(DEMO_DATABASE) : undefined);
if (demo) {
  // Sample data is rebuilt when demo mode is asked for in the address and once a
  // day. Moving around or reloading keeps what was done in the demo, such as a
  // focus block that is running.
  const now = systemClock();
  const asked = new URLSearchParams(window.location.search).has('demo');
  if (asked || (await store.session.get<string>(DEMO_SEEDED_KEY)) !== dayKey(now)) {
    const appearance = { theme: readBootTheme(), language: readBootLanguage() };
    await store.importBackup(createBackup(buildDemoData(now, appearance), now));
    await store.session.set(DEMO_SEEDED_KEY, dayKey(now));
  }
}

const root = document.getElementById('root');
if (!root) throw new Error('Missing #root element');

createRoot(root).render(
  <StrictMode>
    <App store={store} />
  </StrictMode>,
);
