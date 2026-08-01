import { defineConfig } from '@playwright/test';
import { e2eUrls } from './e2e/ports.mts';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: true,
  retries: process.env.CI === 'true' ? 1 : 0,
  use: {
    baseURL: e2eUrls.storefront,
    reducedMotion: 'reduce',
    trace: 'retain-on-failure',
  },
});
