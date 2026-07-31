import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { expect, test } from '@playwright/test';
import { cleanupCatalogTestData } from '../apps/api/test/support/catalog-cleanup.js';
import { e2eUrls, readE2EPorts } from './ports.mts';

const evidenceDirectory = resolve('output/playwright/milestone-2');
const superSession =
  process.env.ADMIN_SUPER_SESSION_TOKEN ?? 'development-super-admin-session-token-00000001';
let acceptanceProductSlug: string | undefined;
let acceptanceCategoryId: string | undefined;
let acceptanceMediaId: string | undefined;

test.afterAll(async () => {
  await cleanupCatalogTestData({
    ...(acceptanceProductSlug ? { productSlug: acceptanceProductSlug } : {}),
    ...(acceptanceCategoryId ? { categoryId: acceptanceCategoryId } : {}),
    ...(acceptanceMediaId ? { mediaId: acceptanceMediaId } : {}),
  });
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
  await page.goBack();
  await page.getByRole('button', { name: 'انتشار' }).click();
  await expect(page.getByRole('status')).toContainText(
    'محصول منتشر شد و اکنون در فروشگاه قابل مشاهده است.',
  );

  await page.goto(`${e2eUrls.storefront}/products/${slug}`);
  await expect(page.getByRole('heading', { name: 'کت لینن پذیرش مرورگر' })).toBeVisible();
  await expect(page.getByText(sku)).toBeAttached();
  await expect(page.locator('script[type="application/ld+json"]')).toHaveCount(2);
  await expect(page.locator('meta[name="description"]')).toHaveAttribute(
    'content',
    'محصول پذیرش فروشگاه KELE',
  );
  await page.close();
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
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.locator('bdi[dir="ltr"]', { hasText: 'KELE-LINEN-BEIGE-7Y' })).toBeAttached();
    await expect(page.getByRole('button', { name: /۷ سال KELE-LINEN-BEIGE-7Y/ })).toBeDisabled();
    expect(await page.evaluate('document.documentElement.scrollWidth <= window.innerWidth')).toBe(
      true,
    );
    await page.screenshot({
      path: resolve(evidenceDirectory, `product-${viewport.name}.png`),
      fullPage: true,
    });
    await page.close();
  }

  const desktop = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await desktop.goto(e2eUrls.storefront);
  await desktop.keyboard.press('Tab');
  await expect(desktop.getByRole('link', { name: 'رفتن به محتوای اصلی' })).toBeFocused();
  await desktop.screenshot({
    path: resolve(evidenceDirectory, 'storefront-home-desktop.png'),
    fullPage: true,
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
        ? desktop.getByLabel(state.label)
        : desktop.getByRole('heading', { name: state.label }),
    ).toBeVisible();
    await desktop.screenshot({
      path: resolve(evidenceDirectory, `catalog-${state.name}-desktop.png`),
      fullPage: true,
    });
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
    await expect(page.getByRole('heading', { name: 'محصولات' })).toBeVisible();
    expect(await page.evaluate('document.documentElement.scrollWidth <= window.innerWidth')).toBe(
      true,
    );
    await page.screenshot({
      path: resolve(evidenceDirectory, `admin-${viewport.name}.png`),
      fullPage: true,
    });
    await page.close();
  }
});
