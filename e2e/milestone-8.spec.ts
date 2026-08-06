import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type BrowserContextOptions, type Page } from '@playwright/test';
import {
  cleanupE2ECustomer,
  createE2EOperationsOrder,
  prepareE2EOperationsCustomer,
  setE2EInventory,
} from '../apps/api/test/support/customer-e2e.js';
import { reviewEvidencePath } from './evidence-paths.mjs';
import { e2eUrls } from './ports.mts';
import { gotoAcceptancePresentationState } from './presentation-fixtures.mjs';

const evidenceDirectory = reviewEvidencePath('milestone-8');
const stateDirectory = resolve(evidenceDirectory, 'states');
const matrixDirectory = resolve(evidenceDirectory, 'route-matrix');
const skuId = '20000000-0000-4000-8000-000000000041';
const mobile = '+989121234578';
const superSession =
  process.env.ADMIN_SUPER_SESSION_TOKEN ?? 'development-super-admin-session-token-00000001';
const adminHeaders = { cookie: `kele_session=${encodeURIComponent(superSession)}` };
const cartIds: string[] = [];

const fixture = {
  skuId,
  orderNumber: 'M8-E2E-00000001',
  ids: {
    customer: '80000000-0000-4000-8000-000000000801',
    checkoutSession: '80000000-0000-4000-8000-000000000802',
    paymentAttempt: '80000000-0000-4000-8000-000000000803',
    order: '80000000-0000-4000-8000-000000000804',
    orderItem: '80000000-0000-4000-8000-000000000805',
    createdTimelineEvent: '80000000-0000-4000-8000-000000000806',
    saleInventoryMovement: '80000000-0000-4000-8000-000000000807',
    createdCorrelation: '80000000-0000-4000-8000-000000000808',
    saleCorrelation: '80000000-0000-4000-8000-000000000809',
  },
  idempotencyKeys: {
    checkout: 'm8-e2e-checkout-00000001',
    payment: 'm8-e2e-payment-00000001',
    createdTimeline: 'm8-e2e-created-00000001',
    saleInventory: 'm8-e2e-sale-00000001',
  },
  providerReference: 'm8-e2e-provider-00000001',
  providerTransactionId: 'm8-e2e-transaction-00000001',
  createdReason: 'پرداخت تأییدشدهٔ آزمون پذیرش ویترین',
  saleReason: 'فروش تأییدشدهٔ آزمون پذیرش ویترین',
  recipient: {
    name: 'مشتری ویترین کِلِه',
    province: 'تهران',
    city: 'تهران',
    addressLine: 'خیابان ولیعصر، کوچهٔ تجربه، پلاک ۸',
    postalCode: '1234567890',
  },
  shipping: {
    methodCode: 'IRAN_POST' as const,
    methodName: 'پست ایران',
    fixedPriceRial: 800_000,
  },
} as const;

const viewports = [
  { label: 'mobile', width: 390, height: 844 },
  { label: 'tablet', width: 768, height: 1024 },
  { label: 'laptop', width: 1280, height: 800 },
  { label: 'desktop', width: 1440, height: 900 },
] as const;

const publicRoutes = [
  { id: 'home', path: '/' },
  { id: 'catalog', path: '/catalog' },
  { id: 'search', path: '/catalog?q=لینن' },
  { id: 'category', path: '/category/suits' },
  { id: 'product', path: '/products/beige-linen-suit' },
  { id: 'outfits', path: '/outfits' },
  { id: 'outfit', path: '/outfits/calm-linen-look' },
  { id: 'occasions', path: '/occasions' },
  { id: 'occasion', path: '/occasion/formal-occasions' },
  { id: 'journal', path: '/journal' },
  { id: 'article', path: '/journal/quiet-craft-of-tailoring' },
  { id: 'sign-in', path: '/sign-in' },
] as const;

const customerRoutes = [
  { id: 'cart', path: '/cart' },
  { id: 'checkout', path: '/checkout' },
  { id: 'account', path: '/account' },
  { id: 'orders', path: '/orders' },
  { id: 'order', path: `/orders/${fixture.orderNumber}` },
  { id: 'fake-payment', path: `/payment/fake?attempt=${fixture.ids.paymentAttempt}` },
  { id: 'payment-result', path: `/payment/result?attempt=${fixture.ids.paymentAttempt}` },
] as const;

let authenticatedState: BrowserContextOptions['storageState'];

async function cartIdFromPage(page: Page): Promise<string> {
  const cookie = (await page.context().cookies()).find((item) => item.name === 'kele_cart');
  const cartId = cookie?.value.slice(0, cookie.value.lastIndexOf('.'));
  if (!cartId) throw new Error('Expected a signed anonymous cart cookie.');
  return cartId;
}

async function completeOtp(page: Page): Promise<void> {
  await page.getByRole('textbox', { name: 'شمارهٔ موبایل', exact: true }).fill(mobile);
  await page.getByRole('button', { name: 'دریافت کد' }).click();
  await page.getByRole('textbox', { name: 'کد یک‌بارمصرف', exact: true }).fill('111111');
  await page.getByRole('button', { name: 'تأیید و ورود' }).click();
  await expect(page).toHaveURL(/\/account$/u);
}

async function settlePage(page: Page): Promise<void> {
  await page.waitForLoadState('domcontentloaded');
  await page.evaluate(async () => {
    window.scrollTo(0, document.body.scrollHeight);
    await new Promise<void>((resolveFrame) => {
      window.setTimeout(resolveFrame, 80);
    });
    window.scrollTo(0, 0);
    await document.fonts.ready;
  });
  await page.waitForFunction(() =>
    Array.from(document.images).every(
      (image) => image.complete && image.naturalWidth > 0 && image.naturalHeight > 0,
    ),
  );
  await page.evaluate(async () => {
    await Promise.all(
      Array.from(document.images).map(async (image) => {
        await image.decode();
      }),
    );
    let style = document.querySelector<HTMLStyleElement>('#m8-visual-stability');
    if (!style) {
      style = document.createElement('style');
      style.id = 'm8-visual-stability';
      style.textContent = `
        *, *::before, *::after {
          animation: none !important;
          caret-color: transparent !important;
          transition: none !important;
        }
        html { scroll-behavior: auto !important; }
      `;
      document.head.append(style);
    }
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
    await new Promise<void>((resolveFrame) => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          resolveFrame();
        });
      });
    });
  });
}

async function assertPageContract(page: Page, consoleErrors: string[]): Promise<void> {
  await expect(page.locator('html')).toHaveAttribute('lang', 'fa-IR');
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  await expect(page.locator('main')).toHaveCount(1);
  await expect(page.locator('main h1')).toHaveCount(1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  expect(
    await page.evaluate(() =>
      Array.from(document.images).every(
        (image) => image.complete && image.naturalWidth > 0 && image.naturalHeight > 0,
      ),
    ),
  ).toBe(true);
  expect(consoleErrors).toEqual([]);
}

async function captureRoute(page: Page, routeId: string, viewportLabel: string): Promise<void> {
  await page.screenshot({
    path: resolve(matrixDirectory, `${routeId}-${viewportLabel}.png`),
    fullPage: true,
    animations: 'disabled',
    caret: 'hide',
  });
  await expect(page).toHaveScreenshot(`${routeId}-${viewportLabel}.png`, {
    fullPage: true,
    animations: 'disabled',
    caret: 'hide',
    maxDiffPixelRatio: 0.01,
  });
}

test.describe.serial('Milestone 8 storefront visual fidelity', () => {
  test.setTimeout(240_000);

  test.beforeAll(async ({ browser, request }) => {
    await Promise.all([
      mkdir(stateDirectory, { recursive: true }),
      mkdir(matrixDirectory, { recursive: true }),
    ]);
    await cleanupE2ECustomer(mobile, []);
    await setE2EInventory(skuId, 4);
    await prepareE2EOperationsCustomer(mobile, fixture.ids.customer);

    const context = await browser.newContext({
      colorScheme: 'light',
      locale: 'fa-IR',
      reducedMotion: 'reduce',
      timezoneId: 'Asia/Tehran',
      viewport: { width: 1280, height: 800 },
    });
    const page = await context.newPage();
    await page.goto(`${e2eUrls.storefront}/products/beige-linen-suit`);
    await page.getByRole('button', { name: /۵ سال KELE-LINEN-BEIGE-5Y/u }).click();
    await page.getByRole('button', { name: 'افزودن به سبد' }).click();
    cartIds.push(await cartIdFromPage(page));
    await page.keyboard.press('Escape');
    await page.goto(`${e2eUrls.storefront}/sign-in`);
    await completeOtp(page);
    await page.getByLabel('نام گیرنده').fill(fixture.recipient.name);
    await page.getByLabel('موبایل گیرنده').fill(mobile);
    await page.getByLabel('استان').fill(fixture.recipient.province);
    await page.getByLabel('شهر').fill(fixture.recipient.city);
    await page.getByLabel('نشانی کامل').fill(fixture.recipient.addressLine);
    await page.getByLabel('کد پستی').fill(fixture.recipient.postalCode);
    await page.getByLabel('نشانی پیش‌فرض باشد').check();
    await page.getByRole('button', { name: 'ذخیره نشانی' }).click();
    await expect(page.getByRole('status')).toContainText('نشانی ذخیره شد');
    authenticatedState = await context.storageState();
    await createE2EOperationsOrder(mobile, fixture);
    await context.close();

    let version = 1;
    for (const [index, transition] of [
      { toStatus: 'preparing', reason: 'آماده‌سازی سفارش شاهد M8' },
      {
        toStatus: 'shipped',
        reason: 'ارسال سفارش شاهد M8',
        tracking: {
          carrier: 'پست ایران',
          trackingNumber: 'KELE-M8-TRACK-001',
          trackingUrl: 'https://example.test/track/KELE-M8-TRACK-001',
        },
      },
      { toStatus: 'delivered', reason: 'تحویل سفارش شاهد M8' },
    ].entries()) {
      const response = await request.post(
        `${e2eUrls.api}/admin/orders/${encodeURIComponent(fixture.orderNumber)}/transitions`,
        {
          headers: {
            ...adminHeaders,
            'if-match': `"${String(version)}"`,
            'idempotency-key': `m8-e2e-transition-${String(index + 1).padStart(2, '0')}`,
          },
          data: transition,
        },
      );
      expect(response.status()).toBe(200);
      version += 1;
    }
  });

  test.afterAll(async () => {
    await cleanupE2ECustomer(mobile, cartIds);
    await setE2EInventory(skuId, 4);
  });

  for (const viewport of viewports) {
    test(`public route matrix at ${viewport.label}`, async ({ browser }) => {
      const context = await browser.newContext({
        colorScheme: 'light',
        locale: 'fa-IR',
        reducedMotion: 'reduce',
        timezoneId: 'Asia/Tehran',
        viewport: { width: viewport.width, height: viewport.height },
      });
      const page = await context.newPage();
      for (const route of publicRoutes) {
        const consoleErrors: string[] = [];
        const listener = (message: { type(): string; text(): string }) => {
          if (message.type() === 'error') consoleErrors.push(message.text());
        };
        page.on('console', listener);
        await page.goto(`${e2eUrls.storefront}${route.path}`);
        await settlePage(page);
        await assertPageContract(page, consoleErrors);
        await captureRoute(page, route.id, viewport.label);
        page.off('console', listener);
      }
      await context.close();
    });

    test(`authenticated route matrix at ${viewport.label}`, async ({ browser }) => {
      const context = await browser.newContext({
        colorScheme: 'light',
        locale: 'fa-IR',
        reducedMotion: 'reduce',
        storageState: authenticatedState,
        timezoneId: 'Asia/Tehran',
        viewport: { width: viewport.width, height: viewport.height },
      });
      const page = await context.newPage();
      for (const route of customerRoutes) {
        const consoleErrors: string[] = [];
        const listener = (message: { type(): string; text(): string }) => {
          if (message.type() === 'error') consoleErrors.push(message.text());
        };
        page.on('console', listener);
        await page.goto(`${e2eUrls.storefront}${route.path}`);
        await settlePage(page);
        await assertPageContract(page, consoleErrors);
        await captureRoute(page, route.id, viewport.label);
        page.off('console', listener);
      }
      await context.close();
    });
  }

  test('loading, empty, failure, unavailable and blocked states are explicit', async ({ page }) => {
    const states = [
      ['home-loading', '/', 'loading', 'در حال دریافت روایت تازهٔ KELE'],
      ['home-error', '/', 'unavailable', 'روایت تازهٔ KELE در دسترس نیست'],
      ['catalog-loading', '/catalog', 'loading', 'در حال بارگذاری کاتالوگ'],
      ['catalog-empty', '/catalog', 'empty', 'نتیجه‌ای پیدا نشد'],
      ['catalog-error', '/catalog?q=لینن', 'error', 'دریافت کاتالوگ ممکن نشد'],
      ['category-loading', '/category/suits', 'loading', 'در حال دریافت محصولات'],
      ['category-empty', '/category/suits', 'empty', 'این دسته هنوز محصولی ندارد'],
      ['category-error', '/category/suits', 'error', 'دریافت این دسته ممکن نشد'],
      ['outfits-loading', '/outfits', 'loading', 'در حال چیدن استایل‌ها'],
      ['outfits-empty', '/outfits', 'empty', 'استایل منتشرشده‌ای وجود ندارد'],
      ['outfits-error', '/outfits', 'error', 'دریافت استایل‌ها ممکن نشد'],
      ['occasions-loading', '/occasions', 'loading', 'در حال دریافت موقعیت‌ها'],
      ['occasions-empty', '/occasions', 'empty', 'هنوز موقعیتی منتشر نشده است'],
      ['occasions-error', '/occasions', 'error', 'موقعیت‌ها در دسترس نیستند'],
      ['occasion-loading', '/occasion/formal-occasions', 'loading', 'در حال دریافت انتخاب‌ها'],
      [
        'occasion-empty',
        '/occasion/formal-occasions',
        'unavailable',
        'محصولی در این انتخاب موجود نیست',
      ],
      ['occasion-error', '/occasion/formal-occasions', 'error', 'دریافت انتخاب‌ها ممکن نشد'],
      ['journal-loading', '/journal', 'loading', 'در حال دریافت ژورنال'],
      ['journal-empty', '/journal', 'empty', 'هنوز روایتی منتشر نشده است'],
      ['journal-error', '/journal', 'error', 'ژورنال اکنون در دسترس نیست'],
    ] as const;
    for (const [id, path, state, text] of states) {
      await gotoAcceptancePresentationState(page, `${e2eUrls.storefront}${path}`, state);
      await expect(page.getByText(text, { exact: false }).first()).toBeVisible();
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
      ).toBe(true);
      await page.screenshot({
        path: resolve(stateDirectory, `${id}.png`),
        fullPage: true,
        animations: 'disabled',
      });
    }

    await page.route('**/api/commerce/cart', async (route) => {
      await route.fulfill({
        status: 503,
        contentType: 'application/json',
        body: JSON.stringify({ status: 503, code: 'DEPENDENCY_UNAVAILABLE', message: 'test' }),
      });
    });
    await page.goto(`${e2eUrls.storefront}/cart`);
    await expect(page.locator('.commerce-page-state[role="alert"]')).toBeVisible();
    await page.screenshot({
      path: resolve(stateDirectory, 'cart-client-failure.png'),
      fullPage: true,
      animations: 'disabled',
    });
    await page.unroute('**/api/commerce/cart');
  });

  test('public query parameters cannot activate acceptance presentation states', async ({
    page,
  }) => {
    await page.goto(`${e2eUrls.storefront}/catalog?state=empty`);
    await expect(page.getByRole('link', { name: /کت‌وشلوار لینن بژ/u }).first()).toBeVisible();
    await expect(page.getByRole('heading', { name: 'نتیجه‌ای پیدا نشد' })).toHaveCount(0);
  });

  test('keyboard-only modal journeys, focus return and reduced motion pass', async ({
    browser,
  }) => {
    const context = await browser.newContext({
      colorScheme: 'light',
      locale: 'fa-IR',
      reducedMotion: 'reduce',
      storageState: authenticatedState,
      viewport: { width: 390, height: 844 },
    });
    const page = await context.newPage();
    await page.goto(e2eUrls.storefront);
    await page.keyboard.press('Tab');
    await expect(page.locator('.skip-link')).toBeFocused();
    await page.getByRole('button', { name: 'باز کردن فهرست' }).focus();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('button', { name: 'بستن فهرست' })).toBeFocused();
    await page.keyboard.press('Shift+Tab');
    await expect(page.getByRole('dialog').getByRole('link', { name: 'سبد خرید' })).toBeFocused();
    await page.keyboard.press('Tab');
    await page.keyboard.press('Escape');
    await expect(page.getByRole('button', { name: 'باز کردن فهرست' })).toBeFocused();
    await page.getByRole('button', { name: /سبد خرید/u }).focus();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('button', { name: 'بستن سبد' })).toBeFocused();
    await page.keyboard.press('Shift+Tab');
    await expect(page.getByRole('button', { name: 'خالی کردن سبد' })).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('button', { name: /سبد خرید/u })).toBeFocused();
    expect(await page.evaluate('document.body.style.overflow')).toBe('');
    expect(
      await page.evaluate(
        'document.getAnimations().filter((animation) => animation.playState === "running" && animation.effect !== null).length',
      ),
    ).toBe(0);
    await page.screenshot({
      path: resolve(stateDirectory, 'keyboard-focus-return-mobile.png'),
      animations: 'disabled',
    });
    await context.close();
  });

  test('mixed RTL/LTR data and the complete customer journey remain readable', async ({
    browser,
  }) => {
    const context = await browser.newContext({
      locale: 'fa-IR',
      reducedMotion: 'reduce',
      storageState: authenticatedState,
      viewport: { width: 1280, height: 800 },
    });
    const page = await context.newPage();
    await page.goto(`${e2eUrls.storefront}/orders/${fixture.orderNumber}`);
    await expect(page.getByText(fixture.orderNumber)).toBeVisible();
    await expect(page.getByText('KELE-M8-TRACK-001')).toBeVisible();
    await expect(
      page
        .locator('bdi[dir="ltr"], bdi')
        .filter({ hasText: /M8|KELE/u })
        .first(),
    ).toBeVisible();
    await page.locator('.return-form input[type="number"]').fill('1');
    await page.locator('.return-form textarea').fill('اندازه برای کودک مناسب نیست');
    await page.getByLabel('کالا استفاده نشده است').check();
    await page.getByLabel('کالا شسته نشده است').check();
    await page.getByLabel('همهٔ برچسب‌ها متصل‌اند').check();
    await page.getByRole('button', { name: 'ثبت درخواست برای بررسی' }).click();
    await expect(page.getByRole('status')).toContainText('درخواست مرجوعی ثبت شد');
    await page.screenshot({
      path: resolve(stateDirectory, 'return-success-desktop.png'),
      fullPage: true,
      animations: 'disabled',
    });
    await context.close();
  });

  test('WCAG critical/serious scan and target-size checks pass', async ({ browser }) => {
    const findings: Array<{ path: string; violations: number }> = [];
    for (const path of ['/', '/catalog', '/products/beige-linen-suit', '/cart', '/checkout']) {
      const context = await browser.newContext({
        locale: 'fa-IR',
        reducedMotion: 'reduce',
        storageState: authenticatedState,
        viewport: { width: 390, height: 844 },
      });
      const page = await context.newPage();
      await page.goto(`${e2eUrls.storefront}${path}`);
      await settlePage(page);
      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
        .analyze();
      const blocking = results.violations.filter(
        (violation) => violation.impact === 'critical' || violation.impact === 'serious',
      );
      findings.push({ path, violations: blocking.length });
      expect(blocking, JSON.stringify(blocking, null, 2)).toEqual([]);
      const undersizedButtons: Array<{ label: string; width: number; height: number }> = [];
      const buttons = page.locator('button:visible');
      for (let index = 0; index < (await buttons.count()); index += 1) {
        const button = buttons.nth(index);
        const box = await button.boundingBox();
        if (box && (box.width < 44 || box.height < 44)) {
          undersizedButtons.push({
            label: (await button.getAttribute('aria-label')) ?? (await button.innerText()),
            width: box.width,
            height: box.height,
          });
        }
      }
      expect(undersizedButtons).toEqual([]);
      await context.close();
    }
    await writeFile(
      resolve(evidenceDirectory, 'accessibility.json'),
      `${JSON.stringify({ findings, standard: 'WCAG 2.2 AA' }, null, 2)}\n`,
      'utf8',
    );
  });

  test('route integrity and local production performance observations are recorded', async ({
    page,
    request,
  }) => {
    const internalLinks = new Set<string>();
    const observations: Array<Record<string, number | string>> = [];
    for (const path of ['/', '/catalog', '/products/beige-linen-suit', '/cart', '/checkout']) {
      await page.goto(`${e2eUrls.storefront}${path}`);
      await settlePage(page);
      const links = page.locator('a[href^="/"]');
      for (let index = 0; index < (await links.count()); index += 1) {
        const href = await links.nth(index).getAttribute('href');
        if (href) internalLinks.add(href);
      }
      observations.push(
        await page.evaluate((route) => {
          const navigation = performance.getEntriesByType('navigation')[0] as
            | {
                domContentLoadedEventEnd: number;
                loadEventEnd: number;
                transferSize: number;
              }
            | undefined;
          return {
            route,
            domContentLoadedMs: Math.round(navigation?.domContentLoadedEventEnd ?? 0),
            loadMs: Math.round(navigation?.loadEventEnd ?? 0),
            transferBytes: navigation?.transferSize ?? 0,
            imageCount: document.images.length,
            scrollHeight: document.documentElement.scrollHeight,
          };
        }, path),
      );
    }
    for (const href of internalLinks) {
      const response = await request.get(`${e2eUrls.storefront}${href}`);
      expect(response.status(), href).toBeLessThan(400);
    }
    await writeFile(
      resolve(evidenceDirectory, 'performance-observations.json'),
      `${JSON.stringify({ environment: 'local production build', observations }, null, 2)}\n`,
      'utf8',
    );
  });
});
