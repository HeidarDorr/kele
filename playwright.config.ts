import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: true,
  retries: process.env.CI === 'true' ? 1 : 0,
  use: {
    baseURL: 'http://127.0.0.1:3000',
    trace: 'retain-on-failure',
  },
  webServer: [
    {
      command: 'node scripts/start-e2e.mjs api',
      url: 'http://127.0.0.1:3001/api/v1/health/live',
      reuseExistingServer: process.env.CI !== 'true',
      timeout: 30_000,
    },
    {
      command: 'node scripts/start-e2e.mjs storefront',
      url: 'http://127.0.0.1:3000',
      reuseExistingServer: process.env.CI !== 'true',
      timeout: 30_000,
    },
    {
      command: 'node scripts/start-e2e.mjs admin',
      url: 'http://127.0.0.1:3002',
      reuseExistingServer: process.env.CI !== 'true',
      timeout: 30_000,
    },
  ],
});
