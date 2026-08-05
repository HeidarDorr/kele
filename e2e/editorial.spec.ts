import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { e2eUrls } from './ports.mts';

const evidenceDirectory = resolve('output/playwright/milestone-7-e2e');
const superSession =
  process.env.ADMIN_SUPER_SESSION_TOKEN ?? 'development-super-admin-session-token-00000001';
const adminHeaders = { cookie: `kele_session=${superSession}` };

async function settleEditorialImages(page: Page): Promise<void> {
  await page.evaluate(async () => {
    window.scrollTo(0, document.body.scrollHeight);
    await new Promise<void>((resolveFrame) => {
      window.setTimeout(resolveFrame, 100);
    });
    window.scrollTo(0, 0);
  });
  await page.waitForFunction(() =>
    Array.from(document.images).every((image) => image.complete && image.naturalWidth > 0),
  );
  await page.evaluate(async () => {
    await document.fonts.ready;
  });
}

test.describe.serial('Milestone 7 editorial acceptance', () => {
  test.beforeAll(async () => mkdir(evidenceDirectory, { recursive: true }));

  for (const viewport of [
    { label: 'mobile', width: 360, height: 800 },
    { label: 'tablet', width: 768, height: 1024 },
    { label: 'laptop', width: 1280, height: 800 },
    { label: 'desktop', width: 1440, height: 900 },
  ]) {
    test(`published Homepage is coherent at ${viewport.label}`, async ({ browser }) => {
      const context = await browser.newContext({
        locale: 'fa-IR',
        reducedMotion: 'reduce',
        viewport: { width: viewport.width, height: viewport.height },
      });
      const page = await context.newPage();
      const errors: string[] = [];
      page.on('console', (message) => {
        if (message.type() === 'error') errors.push(message.text());
      });
      await page.goto(e2eUrls.storefront);
      await expect(page.locator('html')).toHaveAttribute('lang', 'fa-IR');
      await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
      await expect(
        page.getByRole('heading', { name: 'لباس‌هایی برای خاطره‌های آرام کودکی' }),
      ).toBeVisible();
      await expect(page.getByRole('link', { name: 'موقعیت‌ها' }).first()).toHaveAttribute(
        'href',
        '/occasions',
      );
      await expect(page.getByText('خبرنامه', { exact: true })).toHaveCount(0);
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
      ).toBe(true);
      await settleEditorialImages(page);
      expect(errors).toEqual([]);
      await page.screenshot({
        path: resolve(evidenceDirectory, `homepage-${viewport.label}.png`),
        fullPage: true,
      });
      await context.close();
    });
  }

  for (const viewport of [
    { label: 'mobile', width: 360, height: 800 },
    { label: 'tablet', width: 768, height: 1024 },
    { label: 'laptop', width: 1280, height: 800 },
    { label: 'desktop', width: 1440, height: 900 },
  ]) {
    test(`editorial workspace is coherent at ${viewport.label}`, async ({ browser }) => {
      const context = await browser.newContext({
        locale: 'fa-IR',
        reducedMotion: 'reduce',
        viewport: { width: viewport.width, height: viewport.height },
      });
      const page = await context.newPage();
      const errors: string[] = [];
      page.on('console', (message) => {
        if (message.type() === 'error') errors.push(message.text());
      });
      await page.goto(`${e2eUrls.admin}/editorial`);
      await expect(page.locator('html')).toHaveAttribute('lang', 'fa-IR');
      await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
      await expect(page.getByRole('heading', { name: 'تحریریهٔ KELE' })).toBeVisible();
      await expect(page.getByRole('link', { name: /صفحهٔ اصلی/ }).last()).toBeVisible();
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
      ).toBe(true);
      await page.keyboard.press('Tab');
      await expect(page.locator('.skip-link')).toBeFocused();
      expect(errors).toEqual([]);
      await page.screenshot({
        path: resolve(evidenceDirectory, `editorial-${viewport.label}.png`),
        fullPage: true,
      });
      await context.close();
    });
  }

  test('Journal and Occasion routes publish SEO-ready safe projections', async ({ page }) => {
    await page.goto(`${e2eUrls.storefront}/journal/quiet-craft-of-tailoring`);
    await expect(page).toHaveTitle('راهنمای دوخت و پارچه لباس کودک | ژورنال KELE');
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      'href',
      `${e2eUrls.storefront}/journal/quiet-craft-of-tailoring`,
    );
    const articleSchema = await page.locator('script[type="application/ld+json"]').textContent();
    expect(JSON.parse(articleSchema ?? '{}')).toMatchObject({
      '@type': 'Article',
      inLanguage: 'fa-IR',
      headline: 'هنر آرام دوخت برای کودک',
    });
    await expect(page.locator('article script:not([type="application/ld+json"])')).toHaveCount(0);
    await expect(page.getByRole('heading', { name: 'جزئیاتی که تفاوت می‌سازند' })).toBeVisible();

    await page.goto(`${e2eUrls.storefront}/occasion/formal-occasions`);
    await expect(page).toHaveTitle('لباس رسمی کودک برای مراسم | KELE');
    await expect(page.getByRole('heading', { name: 'برای لحظه‌های به‌یادماندنی' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'کت‌وشلوار لینن بژ', exact: true })).toBeVisible();
  });

  test('draft save is isolated, protected preview is authorized, and publication revalidates', async ({
    page,
    request,
  }) => {
    const unauthorized = await request.get(`${e2eUrls.api}/admin/homepage/preview`);
    expect(unauthorized.status()).toBe(401);

    const beforeResponse = await request.get(`${e2eUrls.api}/homepage`);
    const before = (await beforeResponse.json()) as {
      revisionNumber: number;
      publishedAt: string;
    };
    const draftResponse = await request.get(`${e2eUrls.api}/admin/homepage`, {
      headers: adminHeaders,
    });
    const draft = (await draftResponse.json()) as { version: number; sections: unknown[] };
    const saveResponse = await request.put(`${e2eUrls.api}/admin/homepage`, {
      headers: { ...adminHeaders, 'if-match': `"${String(draft.version)}"` },
      data: { sections: draft.sections },
    });
    expect(saveResponse.status()).toBe(200);
    const saved = (await saveResponse.json()) as { version: number };
    const isolated = (await (await request.get(`${e2eUrls.api}/homepage`)).json()) as {
      revisionNumber: number;
      publishedAt: string;
    };
    expect(isolated).toEqual(before);

    await page.goto(`${e2eUrls.admin}/editorial/homepage/preview`);
    await expect(page.getByText(/فقط برای Super Admin/)).toBeVisible();
    await page.keyboard.press('Tab');
    await expect(page.locator('.skip-link')).toBeFocused();

    const publishResponse = await request.post(`${e2eUrls.api}/admin/homepage/publish`, {
      headers: { ...adminHeaders, 'if-match': `"${String(saved.version)}"` },
    });
    expect(publishResponse.status()).toBe(200);
    const after = (await (await request.get(`${e2eUrls.api}/homepage`)).json()) as {
      revisionNumber: number;
      publishedAt: string;
    };
    expect(after.revisionNumber).toBe(before.revisionNumber + 1);
    expect(after.publishedAt).not.toBe(before.publishedAt);
    await page.goto(e2eUrls.storefront);
    await expect(
      page.getByRole('heading', { name: 'لباس‌هایی برای خاطره‌های آرام کودکی' }),
    ).toBeVisible();
  });

  test('Journal editor preserves public snapshot until publish and Media deletion is blocked', async ({
    page,
    request,
  }) => {
    const publicBefore = (await (
      await request.get(`${e2eUrls.api}/journal/quiet-craft-of-tailoring`)
    ).json()) as { publishedAt: string };
    await page.goto(`${e2eUrls.admin}/editorial/journal/70000000-0000-4000-8000-000000000020`);
    await page.getByRole('button', { name: 'ذخیرهٔ پیش‌نویس' }).click();
    await expect(page.getByRole('status')).toContainText('انتشار قبلی دست‌نخورده ماند');
    const publicAfterDraft = (await (
      await request.get(`${e2eUrls.api}/journal/quiet-craft-of-tailoring`)
    ).json()) as { publishedAt: string };
    expect(publicAfterDraft.publishedAt).toBe(publicBefore.publishedAt);
    await page.getByRole('button', { name: 'اعتبارسنجی و انتشار snapshot' }).click();
    await expect(page.getByRole('status')).toContainText('snapshot تغییرناپذیر');
    const publicAfterPublish = (await (
      await request.get(`${e2eUrls.api}/journal/quiet-craft-of-tailoring`)
    ).json()) as { publishedAt: string };
    expect(publicAfterPublish.publishedAt).not.toBe(publicBefore.publishedAt);

    const mediaId = '70000000-0000-4000-8000-000000000043';
    const reportResponse = await request.get(`${e2eUrls.api}/admin/media/${mediaId}/references`, {
      headers: adminHeaders,
    });
    const report = (await reportResponse.json()) as {
      canDelete: boolean;
      references: Array<{ historical: boolean }>;
    };
    expect(report.canDelete).toBe(false);
    expect(report.references.some((reference) => reference.historical)).toBe(true);
    const deletion = await request.delete(`${e2eUrls.api}/admin/media/${mediaId}/references`, {
      headers: adminHeaders,
    });
    expect(deletion.status()).toBe(409);
    await page.goto(`${e2eUrls.admin}/editorial/media/${mediaId}`);
    await expect(page.getByRole('button', { name: /حذف به‌دلیل ارجاع‌ها/ })).toBeDisabled();
  });
});
