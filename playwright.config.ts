import { defineConfig } from '@playwright/test';
import { configuredBrowserExecutable } from './e2e/browser-executable.mts';
import { e2eUrls } from './e2e/ports.mts';

const browserExecutable = configuredBrowserExecutable();

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
    ...(browserExecutable === undefined || browserExecutable.length === 0
      ? {}
      : { launchOptions: { executablePath: browserExecutable } }),
  },
});
