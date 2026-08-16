import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { e2eUrls } from './ports.mts';
import { reviewEvidencePath } from './evidence-paths.mjs';
import { gotoAcceptancePresentationState } from './presentation-fixtures.mjs';

const evidenceDirectory = reviewEvidencePath('milestone-7');
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

async function captureEditorialEvidence(page: Page, filename: string): Promise<void> {
  await settleEditorialImages(page);
  await page.screenshot({
    path: resolve(evidenceDirectory, 'states', filename),
    fullPage: true,
    animations: 'disabled',
    caret: 'hide',
  });
}

test.describe.serial('Milestone 7 editorial acceptance', () => {
  test.beforeAll(async () => {
    await mkdir(resolve(evidenceDirectory, 'states'), { recursive: true });
  });

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

      const successPath =
        viewport.label === 'mobile'
          ? '/editorial/homepage'
          : viewport.label === 'tablet'
            ? '/editorial/settings'
            : viewport.label === 'laptop'
              ? '/editorial/discovery'
              : '/editorial/journal/70000000-0000-4000-8000-000000000020';
      await page.goto(`${e2eUrls.admin}${successPath}`);
      await expect(page.locator('#admin-main h1')).toBeVisible();
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
      ).toBe(true);
      await captureEditorialEvidence(page, `admin-${viewport.label}-success.png`);

      const stateCase =
        viewport.label === 'mobile'
          ? { path: '/editorial', state: 'loading' }
          : viewport.label === 'tablet'
            ? { path: '/editorial/journal', state: 'empty' }
            : viewport.label === 'laptop'
              ? { path: '/editorial/media', state: 'error' }
              : null;
      if (stateCase) {
        await gotoAcceptancePresentationState(
          page,
          `${e2eUrls.admin}${stateCase.path}`,
          stateCase.state,
        );
      } else {
        await page.goto(`${e2eUrls.admin}/editorial/media/70000000-0000-4000-8000-000000000043`);
      }
      if (viewport.label === 'mobile') {
        await expect(page.getByRole('status')).toContainText('در حال دریافت فضای تحریریه');
      } else if (viewport.label === 'tablet') {
        await expect(page.getByText('مقاله‌ای وجود ندارد')).toBeVisible();
      } else if (viewport.label === 'laptop') {
        await expect(page.locator('section.admin-error[role="alert"]')).toContainText(
          'دریافت رسانه‌ها',
        );
      } else {
        await expect(page.getByRole('button', { name: /حذف به‌دلیل ارجاع‌ها/ })).toBeDisabled();
      }
      await captureEditorialEvidence(page, `admin-${viewport.label}-state.png`);
      await context.close();
    });
  }

  test('Media file picker opens from its full preview surface and renders the selection', async ({
    page,
  }) => {
    await page.goto(`${e2eUrls.admin}/editorial/media`);
    const chooserPromise = page.waitForEvent('filechooser');
    await page.locator('.media-file-picker').click();
    const chooser = await chooserPromise;
    await chooser.setFiles(resolve('apps/storefront/public/media/catalog/linen-suit-front.webp'));

    await expect(page.getByRole('img', { name: 'پیش‌نمایش فایل انتخاب‌شده' })).toBeVisible();
    await expect(page.getByText('linen-suit-front.webp', { exact: false })).toBeVisible();
    await expect(page.getByText('تغییر تصویر', { exact: true })).toBeVisible();
  });

  test('Journal and Occasion routes publish SEO-ready safe projections', async ({ page }) => {
    await page.goto(`${e2eUrls.storefront}/journal`);
    await page.getByRole('link', { name: /هنر آرام دوخت برای کودک/ }).click();
    await expect(page).toHaveURL(/\/journal\/quiet-craft-of-tailoring$/u);
    await expect(page).toHaveTitle('راهنمای دوخت و پارچه لباس کودک | ژورنال KELE');
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      'href',
      `${e2eUrls.storefront}/journal/quiet-craft-of-tailoring`,
    );
    const articleScripts = page.locator('script[type="application/ld+json"]');
    await expect(articleScripts).toHaveCount(1);
    await expect(page.locator('#kele-journal-article-json-ld')).toHaveCount(1);
    const articleSchema = await articleScripts.textContent();
    expect(JSON.parse(articleSchema ?? '{}')).toMatchObject({
      '@type': 'Article',
      inLanguage: 'fa-IR',
      headline: 'هنر آرام دوخت برای کودک',
    });
    await expect(page.locator('article script:not([type="application/ld+json"])')).toHaveCount(0);
    await expect(page.getByRole('heading', { name: 'جزئیاتی که تفاوت می‌سازند' })).toBeVisible();
    await page.reload();
    await expect(page.locator('script[type="application/ld+json"]')).toHaveCount(1);
    await expect(page.locator('#kele-journal-article-json-ld')).toHaveCount(1);
    await captureEditorialEvidence(page, 'storefront-journal-success-desktop.png');

    await page.goto(`${e2eUrls.storefront}/occasion/formal-occasions`);
    await expect(page).toHaveTitle('لباس رسمی کودک برای مراسم | KELE');
    await expect(page.getByRole('heading', { name: 'برای لحظه‌های به‌یادماندنی' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'کت‌وشلوار لینن بژ', exact: true })).toBeVisible();
    await captureEditorialEvidence(page, 'storefront-occasion-success-desktop.png');

    const stateCases = [
      {
        name: 'homepage-loading-mobile',
        path: '/',
        state: 'loading',
        width: 360,
        height: 800,
        role: 'status' as const,
        text: 'در حال دریافت روایت تازهٔ KELE',
      },
      {
        name: 'homepage-unavailable-tablet',
        path: '/',
        state: 'unavailable',
        width: 768,
        height: 1024,
        role: 'status' as const,
        text: 'روایت تازهٔ KELE در دسترس نیست',
      },
      {
        name: 'journal-loading-mobile',
        path: '/journal',
        state: 'loading',
        width: 360,
        height: 800,
        role: 'status' as const,
        text: 'در حال دریافت ژورنال',
      },
      {
        name: 'journal-empty-tablet',
        path: '/journal',
        state: 'empty',
        width: 768,
        height: 1024,
        role: 'status' as const,
        text: 'هنوز روایتی منتشر نشده است',
      },
      {
        name: 'journal-error-desktop',
        path: '/journal',
        state: 'error',
        width: 1440,
        height: 900,
        role: 'alert' as const,
        text: 'ژورنال اکنون در دسترس نیست',
      },
      {
        name: 'occasions-loading-mobile',
        path: '/occasions',
        state: 'loading',
        width: 360,
        height: 800,
        role: 'status' as const,
        text: 'در حال دریافت موقعیت‌ها',
      },
      {
        name: 'occasions-empty-tablet',
        path: '/occasions',
        state: 'empty',
        width: 768,
        height: 1024,
        role: 'generic' as const,
        text: 'هنوز موقعیتی منتشر نشده است',
      },
      {
        name: 'occasions-error-desktop',
        path: '/occasions',
        state: 'error',
        width: 1440,
        height: 900,
        role: 'alert' as const,
        text: 'موقعیت‌ها در دسترس نیستند',
      },
      {
        name: 'occasion-unavailable-tablet',
        path: '/occasion/formal-occasions',
        state: 'unavailable',
        width: 768,
        height: 1024,
        role: 'generic' as const,
        text: 'محصولی در این انتخاب موجود نیست',
      },
    ];
    for (const stateCase of stateCases) {
      await page.setViewportSize({ width: stateCase.width, height: stateCase.height });
      await gotoAcceptancePresentationState(
        page,
        `${e2eUrls.storefront}${stateCase.path}`,
        stateCase.state,
      );
      const state =
        stateCase.role === 'generic'
          ? page.getByText(stateCase.text, { exact: true })
          : page.getByRole(stateCase.role).filter({ hasText: stateCase.text });
      await expect(state).toBeVisible();
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
      ).toBe(true);
      await captureEditorialEvidence(page, `${stateCase.name}.png`);
    }
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
    await page.waitForLoadState('networkidle');
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
