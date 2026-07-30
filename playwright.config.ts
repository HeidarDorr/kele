import { defineConfig } from '@playwright/test';

const apiPort = process.env.E2E_API_PORT ?? '3001';
const storefrontPort = process.env.E2E_STOREFRONT_PORT ?? '3000';
const administrationPort = process.env.E2E_ADMIN_PORT ?? '3002';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: true,
  retries: process.env.CI === 'true' ? 1 : 0,
  use: {
    baseURL: `http://127.0.0.1:${storefrontPort}`,
    trace: 'retain-on-failure',
  },
  webServer: [
    {
      command: 'node scripts/start-e2e.mjs api',
      url: `http://127.0.0.1:${apiPort}/api/v1/health/live`,
      reuseExistingServer: process.env.CI !== 'true',
      timeout: 30_000,
    },
    {
      command: 'node scripts/start-e2e.mjs storefront',
      url: `http://127.0.0.1:${storefrontPort}`,
      reuseExistingServer: process.env.CI !== 'true',
      timeout: 30_000,
    },
    {
      command: 'node scripts/start-e2e.mjs admin',
      url: `http://127.0.0.1:${administrationPort}`,
      reuseExistingServer: process.env.CI !== 'true',
      timeout: 30_000,
    },
  ],
});
