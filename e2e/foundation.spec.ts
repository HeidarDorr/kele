import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { cleanupCatalogTestData } from '../apps/api/test/support/catalog-cleanup.js';
import {
  addE2EOutfitReviewLine,
  ageE2EOtpChallenges,
  cleanupE2ECustomer,
  expireE2EPayment,
  readE2EPaymentEvidence,
  setE2EInventory,
} from '../apps/api/test/support/customer-e2e.js';
import { e2eUrls, readE2EPorts } from './ports.mts';

const typographyVariant = process.env.KELE_TYPOGRAPHY === 'markazi' ? 'markazi' : 'elize';
const evidenceDirectory = resolve(
  typographyVariant === 'markazi'
    ? 'output/playwright/milestone-2-markazi'
    : 'output/playwright/milestone-2',
);
const milestoneThreeEvidence = resolve('output/playwright/milestone-3');
const milestoneFourEvidence = resolve('output/playwright/milestone-4');
const superSession =
  process.env.ADMIN_SUPER_SESSION_TOKEN ?? 'development-super-admin-session-token-00000001';
let acceptanceProductSlug: string | undefined;
let acceptanceCategoryId: string | undefined;
let acceptanceMediaId: string | undefined;

async function cartIdFromPage(page: Page): Promise<string> {
  const cookie = (await page.context().cookies()).find((item) => item.name === 'kele_cart');
  const cartId = cookie?.value.slice(0, cookie.value.lastIndexOf('.'));
  if (!cartId) throw new Error('Expected a signed anonymous cart cookie.');
  return cartId;
}

async function completeOtp(page: Page, mobile: string, code = '111111'): Promise<void> {
  await page.getByRole('textbox', { name: 'شمارهٔ موبایل', exact: true }).fill(mobile);
  const challengeResponse = page.waitForResponse(
    (response) =>
      response.url().includes('/api/commerce/auth/otp/challenges') && response.status() === 202,
  );
  await page.getByRole('button', { name: 'دریافت کد' }).click();
  await challengeResponse;
  await page.getByRole('textbox', { name: 'کد یک‌بارمصرف', exact: true }).fill(code);
  await page.getByRole('button', { name: 'تأیید و ورود' }).click();
  await expect(page).toHaveURL(/\/account$/);
}

async function prepareCheckoutCustomer(
  page: Page,
  mobile: string,
  cartIds: string[],
): Promise<void> {
  await page.goto(`${e2eUrls.storefront}/products/beige-linen-suit`);
  await page.getByRole('button', { name: /۵ سال KELE-LINEN-BEIGE-5Y/ }).click();
  await page.getByRole('button', { name: 'افزودن به سبد' }).click();
  cartIds.push(await cartIdFromPage(page));
  await page.keyboard.press('Escape');
  await page.goto(`${e2eUrls.storefront}/sign-in`);
  await completeOtp(page, mobile);
  await page.getByLabel('نام گیرنده').fill('مشتری پرداخت کِلِه');
  await page.getByLabel('موبایل گیرنده').fill(mobile);
  await page.getByLabel('استان').fill('تهران');
  await page.getByLabel('شهر').fill('تهران');
  await page.getByLabel('نشانی کامل').fill('خیابان ولیعصر، کوچهٔ پرداخت، پلاک ۲۴');
  await page.getByLabel('کد پستی').fill('1234567890');
  await page.getByLabel('نشانی پیش‌فرض باشد').check();
  await page.getByRole('button', { name: 'ذخیره نشانی' }).click();
  await expect(page.getByRole('status')).toHaveText('نشانی ذخیره شد.');
  await page.goto(`${e2eUrls.storefront}/cart`);
  await expect(page.getByRole('link', { name: 'ادامه و انتخاب ارسال' })).toBeVisible();
  await page.getByRole('link', { name: 'ادامه و انتخاب ارسال' }).click();
  await expect(page).toHaveURL(/\/checkout$/);
  await expect(page.getByRole('heading', { name: 'ارسال و پرداخت' })).toBeVisible();
  await expect(page.getByRole('radio', { name: /پست ایران/ })).toBeEnabled();
  await expect(page.getByRole('radio', { name: /تیپاکس/ })).toBeEnabled();
  await expect(page.getByRole('radio', { name: /پیک محلی تهران/ })).toBeEnabled();
}

async function captureEvidence(
  page: Page,
  path: string,
  options: { preserveFocus?: boolean; stabilizePage?: boolean } = {},
): Promise<void> {
  if (options.stabilizePage) await page.clock.setFixedTime('2026-08-01T09:00:00.000Z');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.waitForFunction(() => document.fonts.status === 'loaded');
  await page.evaluate(async (captureOptions) => {
    await document.fonts.ready;
    const fontRequests = new Map<string, string>();
    for (const element of [
      document.body,
      ...document.querySelectorAll<HTMLElement>('.wordmark, .footer-wordmark, h1, h2'),
    ]) {
      const style = getComputedStyle(element);
      const font = [style.fontWeight, style.fontSize, style.fontFamily].map(String).join(' ');
      fontRequests.set(font, element.textContent?.slice(0, 32) ?? 'KELE');
    }
    await Promise.all(
      [...fontRequests].map(async ([font, sample]) => {
        await document.fonts.load(font, sample);
        if (!document.fonts.check(font, sample)) {
          throw new Error(`Evidence font did not load: ${font}`);
        }
      }),
    );
    await document.fonts.ready;
    if (captureOptions.stabilizePage) {
      let captureStyle = document.querySelector<HTMLStyleElement>('#kele-evidence-stability');
      if (captureStyle === null) {
        captureStyle = document.createElement('style');
        captureStyle.id = 'kele-evidence-stability';
        captureStyle.textContent = `
          *, *::before, *::after {
            animation: none !important;
            caret-color: transparent !important;
            transition: none !important;
          }
        `;
        document.head.append(captureStyle);
      }
    }
    if (!captureOptions.preserveFocus && document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    if (!captureOptions.preserveFocus) {
      for (const skipLink of document.querySelectorAll<HTMLElement>('.skip-link')) {
        skipLink.style.visibility = 'hidden';
      }
    }
    if (captureOptions.stabilizePage) window.scrollTo(0, 0);
    await new Promise<void>((resolveFrame) => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          resolveFrame();
        });
      });
    });
  }, options);
  if (!options.stabilizePage) {
    await page.screenshot({ path, fullPage: true, caret: 'hide' });
    return;
  }

  await page.mouse.move(0, 0);
  await page.evaluate(async () => {
    let previousHeight = -1;
    let stableFrames = 0;
    for (let frame = 0; frame < 12; frame += 1) {
      await new Promise<void>((resolveFrame) => {
        requestAnimationFrame(() => {
          resolveFrame();
        });
      });
      const height = Math.max(document.documentElement.scrollHeight, document.body.scrollHeight);
      if (height === previousHeight) stableFrames += 1;
      else stableFrames = 0;
      if (stableFrames >= 2) return;
      previousHeight = height;
    }
    throw new Error('Evidence layout height did not stabilize before capture.');
  });
  try {
    await page.screenshot({
      path,
      caret: 'hide',
      fullPage: true,
    });
  } finally {
    await page.clock.resume();
  }
}

async function cleanupAcceptanceFixture(): Promise<void> {
  await cleanupCatalogTestData({
    ...(acceptanceProductSlug ? { productSlug: acceptanceProductSlug } : {}),
    ...(acceptanceCategoryId ? { categoryId: acceptanceCategoryId } : {}),
    ...(acceptanceMediaId ? { mediaId: acceptanceMediaId } : {}),
  });
  acceptanceProductSlug = undefined;
  acceptanceCategoryId = undefined;
  acceptanceMediaId = undefined;
}

test.afterAll(async () => {
  await cleanupAcceptanceFixture();
});

test.afterEach(async () => {
  if (acceptanceProductSlug || acceptanceCategoryId || acceptanceMediaId) {
    await cleanupAcceptanceFixture();
  }
});

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
});

test('API health remains dependency-aware and preserves valid correlation IDs', async ({
  request,
}) => {
  const correlationId = '00000000-0000-4000-8000-000000000001';
  const live = await request.get(`${e2eUrls.api}/health/live`, {
    headers: { 'x-correlation-id': correlationId },
  });
  await expect(live).toBeOK();
  expect(live.headers()['x-correlation-id']).toBe(correlationId);

  const ready = await request.get(`${e2eUrls.api}/health/ready`, {
    headers: { 'x-correlation-id': 'not-a-uuid' },
  });
  await expect(ready).toBeOK();
  expect(ready.headers()['x-correlation-id']).toMatch(
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
  );
});

test('a direct customer return request is rejected without changing inventory', async ({
  request,
}) => {
  const skuId = '20000000-0000-4000-8000-000000000041';
  const headers = {
    cookie: `kele_session=${encodeURIComponent(superSession)}`,
    'content-type': 'application/json',
    'idempotency-key': 'e2e-direct-customer-return-is-forbidden',
  };
  const beforeResponse = await request.get(`${e2eUrls.api}/admin/inventory/${skuId}`, {
    headers,
  });
  await expect(beforeResponse).toBeOK();
  const before = await beforeResponse.json();

  const rejected = await request.post(`${e2eUrls.api}/admin/inventory/${skuId}/actions`, {
    headers,
    data: {
      action: 'customer_return',
      quantity: 1,
      reason: 'درخواست مستقیم بازگشت مشتری',
    },
  });
  expect(rejected.status()).toBe(400);

  const afterResponse = await request.get(`${e2eUrls.api}/admin/inventory/${skuId}`, {
    headers,
  });
  await expect(afterResponse).toBeOK();
  expect(await afterResponse.json()).toEqual(before);
});

test('an administrator creates, validates, previews and publishes a product discoverable in the storefront', async ({
  browser,
  request,
}) => {
  const suffix = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  const headers = {
    cookie: `kele_session=${encodeURIComponent(superSession)}`,
    'content-type': 'application/json',
    'idempotency-key': `e2e-${suffix}`,
  };
  const categoryResponse = await request.post(`${e2eUrls.api}/admin/categories`, {
    headers,
    data: {
      name: 'دستهٔ پذیرش مرورگر',
      slug: `acceptance-category-${suffix}`,
      description: 'دستهٔ مسیر پذیرش مرورگر',
      displayOrder: 850,
      status: 'draft',
    },
  });
  await expect(categoryResponse).toBeOK();
  const category = (await categoryResponse.json()) as { id: string };
  acceptanceCategoryId = category.id;
  const categoriesResponse = await request.get(`${e2eUrls.api}/admin/categories`, {
    headers,
  });
  await expect(categoriesResponse).toBeOK();
  const categories = (await categoriesResponse.json()) as Array<{
    id: string;
    slug: string;
  }>;
  const storefrontCategory = categories.find((item) => item.slug === 'suits');
  if (storefrontCategory === undefined) {
    throw new Error('Deterministic storefront category was not seeded.');
  }

  const mediaResponse = await request.post(`${e2eUrls.api}/admin/media`, {
    headers,
    data: {
      url: '/media/catalog/linen-suit-front.webp',
      width: 1122,
      height: 1402,
      alt: 'نمای روبه‌روی کت لینن بژ برای آزمون پذیرش',
      format: 'webp',
      group: 'product_images',
      focalPoint: { x: 0.5, y: 0.43 },
    },
  });
  await expect(mediaResponse).toBeOK();
  const media = (await mediaResponse.json()) as { id: string };
  acceptanceMediaId = media.id;

  const slug = `acceptance-linen-${suffix}`;
  acceptanceProductSlug = slug;
  const sku = `ACC-${suffix.replaceAll('-', '').toUpperCase()}`;
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  try {
    await page.goto(`${e2eUrls.admin}/products/new`);
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
    await page.getByLabel('نام محصول').fill('کت لینن پذیرش مرورگر');
    await page.getByLabel('Slug').fill(slug);
    await page.getByLabel('توضیح', { exact: true }).fill('کت لینن کامل برای مسیر انتشار تا ویترین');
    await page.getByLabel('جزئیات، هر مورد در یک خط').fill('پارچهٔ لینن\nدوخت تمیز');
    await page.getByLabel('عنوان SEO').fill('کت لینن پذیرش');
    await page.getByLabel('توضیح SEO').fill('محصول پذیرش فروشگاه KELE');
    await page.getByLabel('دسته‌بندی').selectOption([storefrontCategory.id]);
    await page.getByLabel('نام رنگ').fill('بژ');
    await page.getByLabel('کد نرمال رنگ').fill(`beige-${suffix.slice(0, 10)}`);
    await page.getByLabel('تصاویر، مورد نخست تصویر شاخص است').selectOption([media.id]);
    await page.getByLabel('کد SKU').fill(sku);
    await page.getByLabel('اندازهٔ نرمال').fill('6y');
    await page.getByLabel('اندازهٔ نمایشی').fill('۶ سال');
    await page.getByLabel('قیمت به ریال').fill('39800000');
    await page.getByLabel('موجودی فیزیکی').fill('3');
    await page.getByRole('button', { name: 'ساخت پیش‌نویس' }).click();

    await expect(page).toHaveURL(/\/products\/[^/]+\/edit\?notice=created/);
    await expect(page.getByText('آمادهٔ انتشار')).toBeVisible();
    await page.getByRole('link', { name: 'پیش‌نمایش' }).click();
    await expect(
      page.getByText('پیش‌نمایش محافظت‌شده. این صفحه در کاتالوگ عمومی قابل کشف نیست.'),
    ).toBeVisible();
    await expect
      .poll(() =>
        page
          .locator('main img')
          .evaluateAll((images) =>
            images.every((image) => image.complete && image.naturalWidth > 0),
          ),
      )
      .toBe(true);
    await page.goBack();
    await page.getByRole('button', { name: 'انتشار' }).click();
    await expect(page.getByRole('status')).toContainText(
      'محصول منتشر شد و اکنون در فروشگاه قابل مشاهده است.',
    );

    await page.goto(`${e2eUrls.storefront}/products/${slug}`);
    await expect(page.getByRole('heading', { name: 'کت لینن پذیرش مرورگر' })).toBeVisible();
    await expect(page.getByText(sku).first()).toBeAttached();
    await expect(page.locator('script[type="application/ld+json"]')).toHaveCount(2);
    await expect(page.locator('meta[name="description"]')).toHaveAttribute(
      'content',
      'محصول پذیرش فروشگاه KELE',
    );
  } finally {
    await page.close();
    await cleanupAcceptanceFixture();
  }
});

test('visual capture starts from the exclusive deterministic catalog fixture', async ({
  request,
}) => {
  const headers = { cookie: `kele_session=${encodeURIComponent(superSession)}` };
  const [productsResponse, categoriesResponse, mediaResponse] = await Promise.all([
    request.get(`${e2eUrls.api}/admin/products`, { headers }),
    request.get(`${e2eUrls.api}/admin/categories`, { headers }),
    request.get(`${e2eUrls.api}/admin/media`, { headers }),
  ]);
  await expect(productsResponse).toBeOK();
  await expect(categoriesResponse).toBeOK();
  await expect(mediaResponse).toBeOK();

  const products = (await productsResponse.json()) as {
    items: Array<{ slug: string }>;
  };
  const categories = (await categoriesResponse.json()) as Array<{ slug: string }>;
  const media = (await mediaResponse.json()) as Array<{ id: string }>;
  expect(products.items.map((item) => item.slug)).toEqual(['beige-linen-suit']);
  expect(categories.map((item) => item.slug)).toEqual(['suits']);
  expect(media.map((item) => item.id).sort()).toEqual([
    '20000000-0000-4000-8000-000000000031',
    '20000000-0000-4000-8000-000000000032',
    '20000000-0000-4000-8000-000000000033',
  ]);
});

test('storefront covers responsive, state, keyboard, RTL and mixed-direction acceptance evidence', async ({
  browser,
}) => {
  await mkdir(evidenceDirectory, { recursive: true });
  const viewports = [
    { name: 'mobile', width: 390, height: 844 },
    { name: 'tablet', width: 768, height: 1024 },
    { name: 'laptop', width: 1280, height: 800 },
    { name: 'desktop', width: 1440, height: 900 },
  ] as const;

  for (const viewport of viewports) {
    const page = await browser.newPage({ viewport });
    await page.goto(`${e2eUrls.storefront}/products/beige-linen-suit`);
    await expect(page.locator('html')).toHaveAttribute('lang', 'fa-IR');
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
    await expect(page.locator('body')).toHaveAttribute('data-typography', typographyVariant);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(
      page.locator('bdi[dir="ltr"]', { hasText: 'KELE-LINEN-BEIGE-7Y' }).first(),
    ).toBeAttached();
    await expect(page.getByRole('button', { name: /۷ سال KELE-LINEN-BEIGE-7Y/ })).toBeDisabled();
    await page.waitForFunction('document.fonts.status === "loaded"');
    await expect(page.locator('body')).toHaveCSS('font-family', /peyda/i);
    await expect(page.locator('button').first()).toHaveCSS('font-family', /peyda/i);
    await expect(page.locator('h1').first()).toHaveCSS(
      'font-family',
      typographyVariant === 'markazi' ? /markazi/i : /elize/i,
    );
    await expect(page.locator('.wordmark').first()).toHaveCSS('font-family', /elize/i);
    if (typographyVariant === 'markazi') {
      await expect(page.locator('.wordmark .brand-wordmark-fa').first()).toBeVisible();
      await expect(page.locator('.wordmark .brand-wordmark-latin').first()).toBeHidden();
    } else {
      await expect(page.locator('.wordmark .brand-wordmark-fa').first()).toBeHidden();
      await expect(page.locator('.wordmark .brand-wordmark-latin').first()).toBeVisible();
    }
    await expect
      .poll(() =>
        page
          .locator('main img')
          .evaluateAll((images) =>
            images.every((image) => image.complete && image.naturalWidth > 0),
          ),
      )
      .toBe(true);
    expect(await page.evaluate('document.documentElement.scrollWidth <= window.innerWidth')).toBe(
      true,
    );
    await captureEvidence(page, resolve(evidenceDirectory, `product-${viewport.name}.png`));
    await page.close();
  }

  const desktop = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await desktop.goto(e2eUrls.storefront);
  await desktop.keyboard.press('Tab');
  await expect(desktop.getByRole('link', { name: 'رفتن به محتوای اصلی' })).toBeFocused();
  await captureEvidence(desktop, resolve(evidenceDirectory, 'storefront-home-desktop.png'), {
    preserveFocus: true,
  });

  const statePaths = [
    { name: 'loading', path: '/catalog?state=loading', label: 'در حال بارگذاری کاتالوگ' },
    { name: 'empty', path: '/catalog?state=empty', label: 'نتیجه‌ای پیدا نشد' },
    { name: 'error', path: '/catalog?state=error', label: 'دریافت کاتالوگ ممکن نشد' },
  ] as const;
  for (const state of statePaths) {
    await desktop.goto(`${e2eUrls.storefront}${state.path}`);
    await expect(
      state.name === 'loading'
        ? desktop.getByLabel(state.label).first()
        : desktop.getByRole('heading', { name: state.label }),
    ).toBeVisible();
    await captureEvidence(desktop, resolve(evidenceDirectory, `catalog-${state.name}-desktop.png`));
  }
  await desktop.close();
});

test('administration is responsive and exposes validation and inventory states', async ({
  browser,
}) => {
  await mkdir(evidenceDirectory, { recursive: true });
  for (const viewport of [
    { name: 'mobile', width: 390, height: 844 },
    { name: 'tablet', width: 768, height: 1024 },
    { name: 'laptop', width: 1280, height: 800 },
    { name: 'desktop', width: 1440, height: 900 },
  ] as const) {
    const page = await browser.newPage({ viewport });
    await page.goto(e2eUrls.admin);
    await expect(page.locator('html')).toHaveAttribute('lang', 'fa-IR');
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
    await expect(page.locator('body')).toHaveAttribute('data-typography', typographyVariant);
    await expect(page.getByRole('heading', { name: 'محصولات' })).toBeVisible();
    await expect(page.locator('body')).toHaveCSS('font-family', /peyda/i);
    await expect(page.locator('.admin-brand')).toHaveCSS('font-family', /elize/i);
    if (typographyVariant === 'markazi') {
      await expect(page.locator('.admin-brand .brand-wordmark-fa')).toBeVisible();
      await expect(page.locator('.admin-brand .brand-wordmark-latin')).toBeHidden();
    } else {
      await expect(page.locator('.admin-brand .brand-wordmark-fa')).toBeHidden();
      await expect(page.locator('.admin-brand .brand-wordmark-latin')).toBeVisible();
    }
    expect(await page.evaluate('document.documentElement.scrollWidth <= window.innerWidth')).toBe(
      true,
    );
    await captureEvidence(page, resolve(evidenceDirectory, `admin-${viewport.name}.png`));
    await page.close();
  }
});

test('anonymous cart, OTP merge, owned profile/address and logout pass the browser journey', async ({
  browser,
  request,
}) => {
  await mkdir(milestoneThreeEvidence, { recursive: true });
  const mobile = '+989121234567';
  const skuId = '20000000-0000-4000-8000-000000000041';
  const cartIds: string[] = [];
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();
  try {
    await context.addCookies([
      {
        name: 'kele_session',
        value: 'attacker-fixed-session-token-that-must-rotate',
        domain: '127.0.0.1',
        path: '/',
      },
    ]);
    await page.goto(`${e2eUrls.storefront}/products/beige-linen-suit`);
    await page.getByRole('button', { name: /۵ سال KELE-LINEN-BEIGE-5Y/ }).click();
    await page.getByRole('button', { name: 'افزودن به سبد' }).click();
    await expect(page.getByRole('dialog', { name: 'سبد خرید' })).toBeVisible();
    await expect(
      page
        .getByRole('dialog', { name: 'سبد خرید' })
        .getByRole('heading', { name: 'کت‌وشلوار لینن بژ' }),
    ).toBeVisible();
    cartIds.push(await cartIdFromPage(page));

    const cart = (await (
      await page.request.get(`${e2eUrls.storefront}/api/commerce/cart`)
    ).json()) as { version: number };
    const csrfRejected = await page.evaluate(
      async ({ productSkuId, version }) => {
        const response = await fetch('/api/commerce/cart/lines', {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            'if-match': `"${String(version)}"`,
          },
          body: JSON.stringify({ kind: 'product', skuId: productSkuId, quantity: 1 }),
        });
        return response.status;
      },
      { productSkuId: skuId, version: cart.version },
    );
    expect(csrfRejected).toBe(403);

    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog', { name: 'سبد خرید' })).toBeHidden();
    await page.goto(`${e2eUrls.storefront}/sign-in`);
    await completeOtp(page, mobile);
    await page.goto(`${e2eUrls.storefront}/account`);
    await expect(page.getByRole('heading', { name: /سلام،|پروفایل شما/ }).first()).toBeVisible();
    const authenticatedCookie = (await context.cookies()).find(
      (item) => item.name === 'kele_session',
    );
    expect(authenticatedCookie?.value).not.toBe('attacker-fixed-session-token-that-must-rotate');

    await page.getByLabel('نام', { exact: true }).fill('آرمان');
    await page.getByLabel('نام خانوادگی').fill('کلهر');
    await page.getByRole('button', { name: 'ذخیره اطلاعات' }).click();
    await expect(page.getByRole('status')).toContainText('اطلاعات حساب ذخیره شد');
    await page.getByLabel('نام گیرنده').fill('آرمان کلهر');
    await page.getByLabel('موبایل گیرنده').fill(mobile);
    await page.getByLabel('استان').fill('تهران');
    await page.getByLabel('شهر').fill('تهران');
    await page.getByLabel('نشانی کامل').fill('خیابان ایران، کوچهٔ آزمون، پلاک ۱۲');
    await page.getByLabel('کد پستی').fill('1234567890');
    await page.getByLabel('نشانی پیش‌فرض باشد').check();
    await page.getByRole('button', { name: 'ذخیره نشانی' }).click();
    await expect(page.getByText('خیابان ایران، کوچهٔ آزمون، پلاک ۱۲')).toBeVisible();
    await expect(page.locator('.address-list > li')).toHaveCount(1);
    await expect(page.getByRole('status')).toHaveText('نشانی ذخیره شد.');
    await expect(page.getByLabel('نام گیرنده')).toHaveValue('');
    await expect(page.getByRole('button', { name: 'ذخیره نشانی' })).toBeEnabled();
    await captureEvidence(
      page,
      resolve(milestoneThreeEvidence, 'account-profile-address-desktop.png'),
      { stabilizePage: true },
    );

    const revokedToken = authenticatedCookie?.value;
    await page.getByRole('button', { name: 'خروج از حساب' }).click();
    await expect(page).toHaveURL(/\/sign-in$/);
    if (revokedToken === undefined) throw new Error('Authenticated session cookie was not set.');
    const revoked = await request.get(`${e2eUrls.api}/me`, {
      headers: { cookie: `kele_session=${encodeURIComponent(revokedToken)}` },
    });
    expect(revoked.status()).toBe(401);

    await page.goto(`${e2eUrls.storefront}/products/beige-linen-suit`);
    await page.getByRole('button', { name: /۵ سال KELE-LINEN-BEIGE-5Y/ }).click();
    await page.getByRole('button', { name: 'افزودن به سبد' }).click();
    await page.locator('.cart-line select').selectOption('4');
    await expect(page.locator('.cart-line select')).toHaveValue('4');
    cartIds.push(await cartIdFromPage(page));
    await page.keyboard.press('Escape');
    await ageE2EOtpChallenges(mobile);
    await page.goto(`${e2eUrls.storefront}/sign-in`);
    await completeOtp(page, mobile);
    await page.goto(`${e2eUrls.storefront}/cart`);
    await expect(page.getByText('تعداد با موجودی فعلی هماهنگ شد.')).toBeVisible();
    await expect(page.locator('.cart-page-lines select')).toHaveValue('4');
    await captureEvidence(page, resolve(milestoneThreeEvidence, 'cart-merge-notice-laptop.png'));
    for (const viewport of [
      { name: 'mobile', width: 390, height: 844 },
      { name: 'tablet', width: 768, height: 1024 },
      { name: 'desktop', width: 1440, height: 900 },
    ]) {
      await page.setViewportSize(viewport);
      await captureEvidence(
        page,
        resolve(milestoneThreeEvidence, `cart-authenticated-${viewport.name}.png`),
      );
      expect(await page.evaluate('document.documentElement.scrollWidth <= window.innerWidth')).toBe(
        true,
      );
    }
  } finally {
    await context.close();
    await cleanupE2ECustomer(mobile, cartIds);
  }
});

test('cart UI exposes loading, empty, error, unavailable and Outfit review states', async ({
  browser,
}) => {
  await mkdir(milestoneThreeEvidence, { recursive: true });
  const skuId = '20000000-0000-4000-8000-000000000041';
  const cartIds: string[] = [];
  const mobile = '+989121234568';
  try {
    const emptyContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const empty = await emptyContext.newPage();
    await empty.goto(`${e2eUrls.storefront}/cart`);
    await expect(empty.getByText('هنوز چیزی برای نگه‌داشتن انتخاب نکرده‌اید.')).toBeVisible();
    await captureEvidence(empty, resolve(milestoneThreeEvidence, 'cart-empty-mobile.png'));
    await emptyContext.close();

    const errorContext = await browser.newContext({ viewport: { width: 768, height: 1024 } });
    const errorPage = await errorContext.newPage();
    await errorPage.route('**/api/commerce/cart', async (route) => {
      await route.fulfill({
        status: 503,
        contentType: 'application/problem+json',
        body: JSON.stringify({ code: 'DEPENDENCY_UNAVAILABLE' }),
      });
    });
    await errorPage.goto(`${e2eUrls.storefront}/cart`);
    await expect(errorPage.locator('.commerce-page-state.state-error')).toBeVisible();
    await captureEvidence(errorPage, resolve(milestoneThreeEvidence, 'cart-error-tablet.png'));
    await errorContext.close();

    const loadingContext = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const loadingPage = await loadingContext.newPage();
    await loadingPage.route('**/api/commerce/cart', async (route) => {
      await new Promise((resolveDelay) => setTimeout(resolveDelay, 4_000));
      await route.continue();
    });
    await loadingPage.goto(`${e2eUrls.storefront}/cart`);
    await expect(loadingPage.getByText('در حال دریافت سبد…')).toBeVisible();
    await captureEvidence(loadingPage, resolve(milestoneThreeEvidence, 'cart-loading-laptop.png'));
    await loadingContext.close();

    const unavailableContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const unavailable = await unavailableContext.newPage();
    await unavailable.goto(`${e2eUrls.storefront}/products/beige-linen-suit`);
    await unavailable.getByRole('button', { name: /۵ سال KELE-LINEN-BEIGE-5Y/ }).click();
    await unavailable.getByRole('button', { name: 'افزودن به سبد' }).click();
    cartIds.push(await cartIdFromPage(unavailable));
    await setE2EInventory(skuId, 0);
    await unavailable.goto(`${e2eUrls.storefront}/cart`);
    await expect(unavailable.getByText('این انتخاب اکنون ناموجود است.')).toBeVisible();
    await expect(unavailable.getByText(/ادامه خرید تا رفع/)).toBeVisible();
    await captureEvidence(
      unavailable,
      resolve(milestoneThreeEvidence, 'cart-unavailable-desktop.png'),
    );
    await setE2EInventory(skuId, 4);
    await unavailableContext.close();

    const reviewContext = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const review = await reviewContext.newPage();
    await review.goto(`${e2eUrls.storefront}/products/beige-linen-suit`);
    await review.getByRole('button', { name: /۵ سال KELE-LINEN-BEIGE-5Y/ }).click();
    await review.getByRole('button', { name: 'افزودن به سبد' }).click();
    const reviewCartId = await cartIdFromPage(review);
    cartIds.push(reviewCartId);
    await addE2EOutfitReviewLine(reviewCartId);
    await review.goto(`${e2eUrls.storefront}/cart`);
    await expect(review.getByText('این نسخه از استایل نیاز به بررسی دارد.')).toBeVisible();
    await captureEvidence(
      review,
      resolve(milestoneThreeEvidence, 'cart-outfit-requires-review.png'),
    );
    await reviewContext.close();
  } finally {
    await setE2EInventory(skuId, 4);
    await cleanupE2ECustomer(mobile, cartIds);
  }
});

test('checkout covers pending, failed, cancelled and exactly-once paid outcomes in the browser', async ({
  browser,
}) => {
  await mkdir(milestoneFourEvidence, { recursive: true });
  const mobile = '+989121234569';
  const skuId = '20000000-0000-4000-8000-000000000041';
  const cartIds: string[] = [];
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();
  try {
    await setE2EInventory(skuId, 4);
    await prepareCheckoutCustomer(page, mobile, cartIds);
    await page.getByRole('radio', { name: /پیک محلی تهران/ }).check();

    for (const viewport of [
      { name: 'mobile', width: 390, height: 844 },
      { name: 'tablet', width: 768, height: 1024 },
      { name: 'desktop', width: 1440, height: 900 },
    ]) {
      await page.setViewportSize(viewport);
      expect(await page.evaluate('document.documentElement.scrollWidth <= window.innerWidth')).toBe(
        true,
      );
      await captureEvidence(page, resolve(milestoneFourEvidence, `checkout-${viewport.name}.png`));
    }

    await page.setViewportSize({ width: 1280, height: 800 });
    await page.getByRole('button', { name: 'رزرو موجودی و ورود به پرداخت' }).click();
    await expect(page).toHaveURL(/\/payment\/fake\?attempt=/);
    const fakeUrl = page.url();
    await expect(page.getByRole('heading', { name: 'شبیه‌ساز درگاه پرداخت' })).toBeVisible();
    await captureEvidence(page, resolve(milestoneFourEvidence, 'fake-gateway-laptop.png'));

    await page.getByRole('button', { name: 'در انتظار تأیید' }).click();
    await expect(page).toHaveURL(/\/payment\/result\?attempt=/);
    await expect(
      page.getByRole('heading', { name: 'نتیجهٔ پرداخت هنوز نهایی نیست' }),
    ).toBeVisible();
    await captureEvidence(page, resolve(milestoneFourEvidence, 'payment-pending.png'));

    await page.goto(fakeUrl);
    await page.getByRole('button', { name: 'پرداخت ناموفق' }).click();
    await expect(page.getByRole('heading', { name: 'پرداخت ناموفق بود' })).toBeVisible();
    await captureEvidence(page, resolve(milestoneFourEvidence, 'payment-failed.png'));

    await page.goto(fakeUrl);
    await page.getByRole('button', { name: 'انصراف مشتری' }).click();
    await expect(page.getByRole('heading', { name: 'از پرداخت منصرف شدید' })).toBeVisible();
    await captureEvidence(page, resolve(milestoneFourEvidence, 'payment-cancelled.png'));

    await page.goto(fakeUrl);
    await page.getByRole('button', { name: 'پرداخت موفق' }).click();
    await expect(page.getByRole('heading', { name: 'سفارش شما ثبت شد' })).toBeVisible();
    await captureEvidence(page, resolve(milestoneFourEvidence, 'payment-paid.png'));
    await page.getByRole('link', { name: 'مشاهدهٔ سفارش' }).click();
    await expect(page.getByRole('heading', { name: 'جزئیات سفارش' })).toBeVisible();
    await expect(page.getByText('پیک محلی تهران')).toBeVisible();
    await expect(page.locator('.order-items > li')).toHaveCount(1);
    await captureEvidence(page, resolve(milestoneFourEvidence, 'paid-order-desktop.png'));

    await expect
      .poll(() => readE2EPaymentEvidence(mobile, skuId))
      .toEqual({
        orders: 1,
        reconciliations: 0,
        callbacks: 4,
        physicalQuantity: 3,
        reservedQuantity: 0,
      });
  } finally {
    await context.close();
    await cleanupE2ECustomer(mobile, cartIds);
    await setE2EInventory(skuId, 4);
  }
});

test('tampered amount is shown as reconciliation and never creates an Order', async ({
  browser,
}) => {
  await mkdir(milestoneFourEvidence, { recursive: true });
  const mobile = '+989121234570';
  const skuId = '20000000-0000-4000-8000-000000000041';
  const cartIds: string[] = [];
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();
  try {
    await setE2EInventory(skuId, 4);
    await prepareCheckoutCustomer(page, mobile, cartIds);
    await page.getByRole('button', { name: 'رزرو موجودی و ورود به پرداخت' }).click();
    await expect(page).toHaveURL(/\/payment\/fake\?attempt=/);
    await page.getByText('آزمون امنیتی مبلغ').click();
    await page.getByRole('button', { name: 'ارسال مبلغ دست‌کاری‌شده' }).click();
    await expect(page.getByRole('heading', { name: 'پرداخت در حال تطبیق است' })).toBeVisible();
    await expect(page.getByText(/هیچ سفارش یا کسر موجودی تکراری انجام نشده است/)).toBeVisible();
    await captureEvidence(page, resolve(milestoneFourEvidence, 'payment-reconciliation.png'));
    await expect
      .poll(() => readE2EPaymentEvidence(mobile, skuId))
      .toEqual({
        orders: 0,
        reconciliations: 1,
        callbacks: 1,
        physicalQuantity: 4,
        reservedQuantity: 1,
      });
  } finally {
    await context.close();
    await cleanupE2ECustomer(mobile, cartIds);
    await setE2EInventory(skuId, 4);
  }
});

test('expired reservation is visible and cannot become an Order', async ({ browser }) => {
  await mkdir(milestoneFourEvidence, { recursive: true });
  const mobile = '+989121234571';
  const skuId = '20000000-0000-4000-8000-000000000041';
  const cartIds: string[] = [];
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();
  try {
    await setE2EInventory(skuId, 4);
    await prepareCheckoutCustomer(page, mobile, cartIds);
    await page.getByRole('button', { name: 'رزرو موجودی و ورود به پرداخت' }).click();
    await expect(page).toHaveURL(/\/payment\/fake\?attempt=/);
    const attemptId = new URL(page.url()).searchParams.get('attempt');
    if (attemptId === null) throw new Error('Fake payment URL did not include its attempt ID.');
    await expireE2EPayment(attemptId);
    await page.goto(
      `${e2eUrls.storefront}/payment/result?attempt=${encodeURIComponent(attemptId)}`,
    );
    await expect(page.getByRole('heading', { name: 'مهلت پرداخت تمام شده است' })).toBeVisible();
    await captureEvidence(page, resolve(milestoneFourEvidence, 'payment-expired.png'));
    await expect
      .poll(() => readE2EPaymentEvidence(mobile, skuId))
      .toEqual({
        orders: 0,
        reconciliations: 0,
        callbacks: 0,
        physicalQuantity: 4,
        reservedQuantity: 0,
      });
  } finally {
    await context.close();
    await cleanupE2ECustomer(mobile, cartIds);
    await setE2EInventory(skuId, 4);
  }
});
