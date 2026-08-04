import { defineConfig } from '@playwright/test';
import { e2eUrls } from './e2e/ports.mts';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: true,
  retries: 0,
  workers: 1,
  use: {
    baseURL: e2eUrls.storefront,
    colorScheme: 'light',
    locale: 'fa-IR',
    reducedMotion: 'reduce',
    timezoneId: 'Asia/Tehran',
    trace: 'retain-on-failure',
  },
});
