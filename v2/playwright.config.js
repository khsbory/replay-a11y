import { defineConfig } from '@playwright/test';

const port = Number(process.env.REPLAY_TEST_PORT ?? 4173);
const baseURL = `http://127.0.0.1:${port}`;

export default defineConfig({
  testDir: './tests',
  testMatch: '**/*.spec.js',
  timeout: 20_000,
  workers: 1,
  reporter: 'list',
  use: {
    channel: 'chrome',
    baseURL,
    serviceWorkers: 'block',
  },
  webServer: {
    command: `npm run preview -- --outDir dist-test --port ${port}`,
    url: baseURL,
    reuseExistingServer: false,
    timeout: 15_000,
  },
});
