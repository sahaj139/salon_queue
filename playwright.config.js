import { defineConfig } from '@playwright/test';

const PORT = 4321;
export default defineConfig({
  testDir: 'tests',
  testMatch: '*.spec.js',
  workers: 1, // one shared server queue
  fullyParallel: false,
  timeout: 45_000,
  reporter: [['list']],
  use: { baseURL: `http://localhost:${PORT}`, trace: 'retain-on-failure' },
  webServer: {
    command: 'npm run build && node server/index.js',
    url: `http://localhost:${PORT}/api/state`,
    env: { PORT: String(PORT), NOSHOW_MINUTES: '0' }, // no-show unlocks immediately in tests
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
