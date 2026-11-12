import { defineConfig, devices } from '@playwright/test';

const PORT = 4173;

/**
 * End-to-end tests run against the production build, the same files that are
 * deployed. English and a fixed time zone keep the expected texts stable.
 */
export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: `http://localhost:${PORT}`,
    locale: 'en-US',
    timezoneId: 'America/Sao_Paulo',
    // Each test starts from an empty app; the service worker would cache across them.
    serviceWorkers: 'block',
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: `npm run build && npm run preview -- --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
