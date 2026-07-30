import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { expect, test } from '@playwright/test';

const reviewScreenshotsDirectory = resolve('output/playwright/milestone-1');
const reviewViewports = [
  { name: 'mobile', width: 390, height: 844 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'desktop', width: 1440, height: 900 },
] as const;

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
  await page.goto('http://127.0.0.1:3002');
  await expect(page.locator('html')).toHaveAttribute('lang', 'fa-IR');
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  await expect(page.getByText('ADM-KELE-001')).toBeVisible();
});

test('API liveness preserves a valid correlation ID', async ({ request }) => {
  const correlationId = '00000000-0000-4000-8000-000000000001';
  const response = await request.get('http://127.0.0.1:3001/api/v1/health/live', {
    headers: { 'x-correlation-id': correlationId },
  });
  await expect(response).toBeOK();
  expect(response.headers()['x-correlation-id']).toBe(correlationId);
  await expect(response.json()).resolves.toMatchObject({ status: 'ok', correlationId });
});

test('API readiness is dependency-aware and replaces an invalid correlation ID', async ({
  request,
}) => {
  const response = await request.get('http://127.0.0.1:3001/api/v1/health/ready', {
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
    await storefront.goto('http://127.0.0.1:3000');
    await expect(storefront.getByText('SKU-KELE-001')).toBeVisible();
    await storefront.screenshot({
      path: resolve(reviewScreenshotsDirectory, `storefront-${viewport.name}.png`),
      fullPage: true,
    });
    await storefront.close();

    const administration = await browser.newPage({ viewport });
    await administration.goto('http://127.0.0.1:3002');
    await expect(administration.getByText('ADM-KELE-001')).toBeVisible();
    await administration.screenshot({
      path: resolve(reviewScreenshotsDirectory, `admin-${viewport.name}.png`),
      fullPage: true,
    });
    await administration.close();
  }
});
