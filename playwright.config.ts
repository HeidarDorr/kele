import { defineConfig } from '@playwright/test';
import { e2eUrls } from './e2e/ports.mts';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: true,
  retries: process.env.CI === 'true' ? 1 : 0,
  use: {
    baseURL: e2eUrls.storefront,
    trace: 'retain-on-failure',
  },
  webServer: [
    {
      command: 'node scripts/start-e2e.mjs api',
      url: `${e2eUrls.api}/health/live`,
      reuseExistingServer: process.env.CI !== 'true',
      timeout: 30_000,
    },
    {
      command: 'node scripts/start-e2e.mjs storefront',
      url: e2eUrls.storefront,
      reuseExistingServer: process.env.CI !== 'true',
      timeout: 30_000,
    },
    {
      command: 'node scripts/start-e2e.mjs admin',
      url: e2eUrls.admin,
      reuseExistingServer: process.env.CI !== 'true',
      timeout: 30_000,
    },
  ],
});
