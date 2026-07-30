import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { expect, test } from '@playwright/test';
import { e2eUrls, readE2EPorts } from './ports.mts';

const reviewScreenshotsDirectory = resolve('output/playwright/milestone-1');
const reviewViewports = [
  { name: 'mobile', width: 390, height: 844 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'laptop', width: 1280, height: 800 },
  { name: 'desktop', width: 1440, height: 900 },
] as const;

test('E2E port overrides accept valid values and reject invalid values', () => {
  expect(
    readE2EPorts({
      E2E_API_PORT: '3101',
      E2E_STOREFRONT_PORT: '3100',
      E2E_ADMIN_PORT: '3102',
    }),
  ).toEqual({ api: 3101, storefront: 3100, admin: 3102 });
  expect(() => readE2EPorts({ E2E_API_PORT: '0' })).toThrow(
    'E2E_API_PORT must be an integer between 1 and 65535.',
  );
  expect(() => readE2EPorts({ E2E_STOREFRONT_PORT: 'not-a-port' })).toThrow(
    'E2E_STOREFRONT_PORT must be an integer between 1 and 65535.',
  );
  expect(() => readE2EPorts({ E2E_ADMIN_PORT: '65536' })).toThrow(
    'E2E_ADMIN_PORT must be an integer between 1 and 65535.',
  );
});

test('storefront foundation is Persian RTL and preserves mixed-direction SKU text', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('lang', 'fa-IR');
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  await expect(page.getByText('SKU-KELE-001')).toBeVisible();
});

test('administration foundation is Persian RTL', async ({ browser }) => {
  const page = await browser.newPage({ viewport: { width: 768, height: 1024 } });
  await page.goto(e2eUrls.admin);
  await expect(page.locator('html')).toHaveAttribute('lang', 'fa-IR');
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  await expect(page.getByText('ADM-KELE-001')).toBeVisible();
});

test('API liveness preserves a valid correlation ID', async ({ request }) => {
  const correlationId = '00000000-0000-4000-8000-000000000001';
  const response = await request.get(`${e2eUrls.api}/health/live`, {
    headers: { 'x-correlation-id': correlationId },
  });
  await expect(response).toBeOK();
  expect(response.headers()['x-correlation-id']).toBe(correlationId);
  await expect(response.json()).resolves.toMatchObject({ status: 'ok', correlationId });
});

test('API readiness is dependency-aware and replaces an invalid correlation ID', async ({
  request,
}) => {
  const response = await request.get(`${e2eUrls.api}/health/ready`, {
    headers: { 'x-correlation-id': 'not-a-uuid' },
  });
  await expect(response).toBeOK();
  expect(response.headers()['x-correlation-id']).toMatch(
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
  );
});

test('captures reviewable storefront and administration evidence at acceptance viewports', async ({
  browser,
}) => {
  await mkdir(reviewScreenshotsDirectory, { recursive: true });

  for (const viewport of reviewViewports) {
    const storefront = await browser.newPage({ viewport });
    await storefront.goto(e2eUrls.storefront);
    await expect(storefront.getByText('SKU-KELE-001')).toBeVisible();
    await storefront.screenshot({
      path: resolve(reviewScreenshotsDirectory, `storefront-${viewport.name}.png`),
      fullPage: true,
    });
    await storefront.close();

    const administration = await browser.newPage({ viewport });
    await administration.goto(e2eUrls.admin);
    await expect(administration.getByText('ADM-KELE-001')).toBeVisible();
    await administration.screenshot({
      path: resolve(reviewScreenshotsDirectory, `admin-${viewport.name}.png`),
      fullPage: true,
    });
    await administration.close();
  }
});
