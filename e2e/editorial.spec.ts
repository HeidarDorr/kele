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
    const images = Array.from(document.images);
    images.forEach((image) => {
      image.loading = 'eager';
    });
    window.scrollTo(0, document.body.scrollHeight);
    await new Promise<void>((resolveFrame) => {
      window.setTimeout(resolveFrame, 100);
    });
    window.scrollTo(0, 0);
    await Promise.all(
      images.map(
        (image) =>
          new Promise<void>((resolveImage, rejectImage) => {
            const assertDecodedImage = () => {
              if (image.naturalWidth > 0) {
                resolveImage();
                return;
              }
              rejectImage(
                new Error(`Editorial image failed to decode: ${String(image.currentSrc)}`),
              );
            };

            if (image.complete) {
              assertDecodedImage();
              return;
            }

            image.addEventListener('load', assertDecodedImage, { once: true });
            image.addEventListener(
              'error',
              () => {
                rejectImage(
                  new Error(`Editorial image failed to load: ${String(image.currentSrc)}`),
                );
              },
              { once: true },
            );
          }),
      ),
    );
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
      const header = page.locator('.site-header');
      await expect(header).toHaveCSS('position', 'fixed');
      await expect(page.locator('.header-search')).toHaveAttribute(
        'aria-label',
        'جست‌وجوی محصولات',
      );
      await expect(page.locator('.header-account-link')).toHaveAttribute(
        'aria-label',
        'حساب مشتری',
      );
      await expect(page.locator('.header-cart-button')).toHaveAccessibleName(/سبد خرید/);
      await expect(page.locator('.header-account-link')).toHaveText('');
      const { headerHeight, headerSpacerHeight } = await page.evaluate(() => ({
        headerHeight: document.querySelector('.site-header')?.clientHeight ?? 0,
        headerSpacerHeight: document.querySelector('.site-header-spacer')?.clientHeight ?? 0,
      }));
      expect(headerHeight).toBeGreaterThan(0);
      expect(Math.abs(headerHeight - headerSpacerHeight)).toBeLessThanOrEqual(1);
      if (viewport.label === 'mobile') {
        const wordmarkBox = await page.locator('.wordmark .brand-wordmark').boundingBox();
        if (!wordmarkBox) throw new Error('Mobile wordmark is missing');
        expect(wordmarkBox.width).toBeLessThanOrEqual(93);
      }
      if (viewport.label === 'desktop') {
        await expect(page.locator('.desktop-products-menu li')).toHaveCount(8);
        const menuGrid = await page.locator('.desktop-products-grid').evaluate((element) => {
          const styles = window.getComputedStyle(element);
          return {
            columns: styles.gridTemplateColumns.split(' ').length,
            rows: styles.gridTemplateRows.split(' ').length,
          };
        });
        expect(menuGrid).toEqual({ columns: 4, rows: 2 });
        await expect(page.locator('.desktop-products-promo img')).toHaveAttribute(
          'src',
          /products-promo\.webp/u,
        );
        await expect(page.locator('.desktop-products-grid')).not.toContainText(/\d/u);
      }
      const closingBox = await page.locator('.home-closing').boundingBox();
      const footerBox = await page.locator('.site-footer').boundingBox();
      if (!closingBox || !footerBox) throw new Error('Homepage closing band or footer is missing');
      expect(Math.abs(footerBox.y - (closingBox.y + closingBox.height))).toBeLessThanOrEqual(1);
      await settleEditorialImages(page);
      expect(errors).toEqual([]);
      await page.screenshot({
        path: resolve(evidenceDirectory, `homepage-${viewport.label}.png`),
        fullPage: true,
      });
      await context.close();
    });
  }

  test('desktop header links keep their text color and route-active underline', async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`${e2eUrls.storefront}/catalog`);
    const productsLink = page
      .locator('.desktop-nav > ul > li > a.is-active')
      .filter({ visible: true });
    await expect(productsLink).toHaveAttribute('aria-current', 'page');
    await expect(productsLink).toHaveCSS('color', 'rgb(48, 37, 30)');
    await expect(productsLink).toHaveCSS('transition', 'none');
    const headerRuleOffset = await productsLink.evaluate((element) =>
      String(window.getComputedStyle(element).getPropertyValue('--kele-link-rule-offset')).trim(),
    );
    const activeRule = await productsLink.evaluate((element) => {
      const style = window.getComputedStyle(element, '::after');
      return {
        color: style.backgroundColor,
        clipPath: style.clipPath,
        offset: Number.parseFloat(style.insetBlockEnd),
        transform: style.transform,
      };
    });
    expect(activeRule.color).toBe('rgb(48, 37, 30)');
    expect(activeRule.clipPath).not.toBe('inset(0px)');
    expect(activeRule.offset).toBeGreaterThan(8);
    expect(activeRule.transform).toBe('matrix(1, 0, 0, 1, 0, 0)');

    const productsItem = page.locator('.desktop-products-item').filter({ visible: true });
    await productsItem.hover();
    await expect(page.locator('.desktop-products-menu').filter({ visible: true })).toBeVisible();
    await expect
      .poll(() =>
        productsLink.evaluate((element) =>
          String(window.getComputedStyle(element, '::after').clipPath),
        ),
      )
      .toBe('inset(0px)');

    await page.locator('.wordmark').hover();
    await expect
      .poll(() =>
        productsLink.evaluate((element) =>
          String(window.getComputedStyle(element, '::after').clipPath),
        ),
      )
      .not.toBe('inset(0px)');

    const cartButton = page.locator('.header-cart-button').filter({ visible: true });
    const restingColor = await cartButton.evaluate((button) =>
      String(window.getComputedStyle(button).color),
    );
    await cartButton.hover();
    await expect(cartButton).toHaveCSS('color', restingColor);
    await expect
      .poll(() =>
        cartButton.evaluate((button) =>
          Number(window.getComputedStyle(button, '::before').opacity),
        ),
      )
      .toBeGreaterThan(0.9);
    const iconState = await cartButton.evaluate((button) => {
      const icon = button.querySelector('svg');
      if (!icon) throw new Error('Cart icon is missing');
      const buttonBox = button.getBoundingClientRect();
      const iconBox = icon.getBoundingClientRect();
      const hoverDisc = window.getComputedStyle(button, '::before');
      return {
        x: Math.abs(
          Number(iconBox.left) +
            Number(iconBox.width) / 2 -
            (Number(buttonBox.left) + Number(buttonBox.width) / 2),
        ),
        y: Math.abs(
          Number(iconBox.top) +
            Number(iconBox.height) / 2 -
            (Number(buttonBox.top) + Number(buttonBox.height) / 2),
        ),
        discTransform: hoverDisc.transform,
      };
    });
    expect(iconState.x).toBeLessThanOrEqual(1);
    expect(iconState.y).toBeLessThanOrEqual(1);
    expect(iconState.discTransform).not.toBe('none');
    const compactDisc = await cartButton.evaluate((button) => {
      const style = window.getComputedStyle(button, '::before');
      return {
        inset: Number.parseFloat(style.insetBlockStart),
        scale: new DOMMatrix(style.transform).a,
        transitionDuration: style.transitionDuration,
      };
    });
    expect(compactDisc.inset).toBeGreaterThan(0);
    expect(compactDisc.scale).toBeLessThanOrEqual(1.001);
    expect(compactDisc.transitionDuration).toContain('0.12s');

    await page.goto(e2eUrls.storefront);
    const homeTextLink = page.locator('.home-text-link').filter({ visible: true }).first();
    await expect(homeTextLink).toBeVisible();
    const homeRuleOffset = await homeTextLink.evaluate((element) =>
      String(window.getComputedStyle(element).getPropertyValue('--kele-link-rule-offset')).trim(),
    );
    expect(homeRuleOffset).toBe(headerRuleOffset);
    const restingHomeRule = await homeTextLink.evaluate((element) =>
      String(window.getComputedStyle(element, '::after').clipPath),
    );
    expect(restingHomeRule).not.toBe('inset(0px)');
    await homeTextLink.hover();
    await expect
      .poll(() =>
        homeTextLink.evaluate((element) =>
          String(window.getComputedStyle(element, '::after').clipPath),
        ),
      )
      .toBe('inset(0px)');
    await page.locator('.wordmark').hover();
    await expect
      .poll(() =>
        homeTextLink.evaluate((element) =>
          String(window.getComputedStyle(element, '::after').clipPath),
        ),
      )
      .toBe(restingHomeRule);
  });

  test('product discovery uses image-led groups without decorative numbering', async ({
    browser,
  }) => {
    test.setTimeout(120_000);
    for (const viewport of [
      { label: 'mobile', width: 390, height: 844 },
      { label: 'tablet', width: 768, height: 1024 },
      { label: 'laptop', width: 1280, height: 800 },
      { label: 'desktop', width: 1440, height: 900 },
    ]) {
      const context = await browser.newContext({
        locale: 'fa-IR',
        reducedMotion: 'reduce',
        viewport,
      });
      const page = await context.newPage();
      await page.goto(`${e2eUrls.storefront}/catalog`);

      const categoryIndex = page.locator('.product-category-index').filter({ visible: true });
      await expect(categoryIndex.locator('.product-category-card')).toHaveCount(8);
      await expect(categoryIndex).not.toContainText(/[0-9۰-۹]/u);
      await expect(categoryIndex.locator('img')).toHaveCount(8);
      await expect(page.locator('.product-grid a[href^="/outfits/"]').first()).toBeVisible();
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
      ).toBe(true);

      if (viewport.width >= 1024) {
        await page.locator('.desktop-products-item').filter({ visible: true }).hover();
        const menu = page.locator('.desktop-products-panel').filter({ visible: true });
        await expect(menu.locator('.desktop-products-grid li')).toHaveCount(8);
        await expect(menu.locator('.desktop-products-grid')).not.toContainText(/[0-9۰-۹]/u);
        const layout = await menu.evaluate((element) => {
          const promo = element.querySelector<HTMLElement>('.desktop-products-promo');
          const groups = element.querySelector<HTMLElement>('.desktop-products-grid');
          if (!promo || !groups) throw new Error('Desktop Product menu is incomplete');
          return {
            columns: window.getComputedStyle(groups).gridTemplateColumns.split(' ').length,
            promoLeft: promo.getBoundingClientRect().left < groups.getBoundingClientRect().left,
          };
        });
        expect(layout).toEqual({ columns: 4, promoLeft: true });
      } else {
        const menuTrigger = page.getByRole('button', { name: 'باز کردن فهرست' });
        const mobileDialog = page.getByRole('dialog');
        await expect
          .poll(async () => {
            if (await mobileDialog.isVisible()) return true;
            await menuTrigger.click();
            return mobileDialog.isVisible();
          })
          .toBe(true);
        const productDisclosure = mobileDialog.getByRole('button', {
          name: 'نمایش گروه‌های محصولات',
        });
        await expect(productDisclosure).toBeVisible();
        await productDisclosure.click();
        const groups = page.locator('.mobile-product-links');
        await expect(groups.getByRole('link')).toHaveCount(8);
        await expect(groups.locator('img')).toHaveCount(8);
        await expect(groups).not.toContainText(/[0-9۰-۹]/u);
      }

      await page.screenshot({
        path: resolve(evidenceDirectory, 'states', `product-discovery-${viewport.label}.png`),
        fullPage: true,
        animations: 'disabled',
      });
      await context.close();
    }
  });

  test('mobile editorial grids preserve spacing and image hierarchy', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(e2eUrls.storefront);

    const promises = page.locator('.home-promise-grid > li');
    await expect(promises).toHaveCount(4);
    for (const index of [0, 1]) {
      const firstRowStyle = await promises.nth(index).evaluate((item) => {
        const style = window.getComputedStyle(item);
        return {
          border: style.borderBlockStartWidth,
          padding: style.paddingBlockStart,
        };
      });
      expect(firstRowStyle.border).toBe('0px');
      expect(firstRowStyle.padding).toBe('0px');
    }
    await expect(promises.nth(2)).toHaveCSS('border-block-start-width', '1px');
    await page.screenshot({
      path: resolve(evidenceDirectory, 'states', 'homepage-mobile-refinements.png'),
      fullPage: true,
      animations: 'disabled',
    });

    await page.goto(`${e2eUrls.storefront}/occasions`);
    const occasionLink = page.locator('.occasion-index-list article > a').first();
    const occasionMedia = occasionLink.locator('.occasion-index-media');
    await expect(occasionMedia).toBeVisible();
    const linkBox = await occasionLink.boundingBox();
    const mediaBox = await occasionMedia.boundingBox();
    if (!linkBox || !mediaBox) throw new Error('Mobile Occasion card is incomplete');
    expect(mediaBox.width).toBeGreaterThanOrEqual(linkBox.width * 0.98);
    expect(mediaBox.width).toBeGreaterThan(300);
    await page.screenshot({
      path: resolve(evidenceDirectory, 'states', 'occasion-index-mobile-refinements.png'),
      fullPage: true,
      animations: 'disabled',
    });
  });

  test('header search focuses Catalog search and the footer control returns to top', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(e2eUrls.storefront);
    await page.locator('.header-search').click();
    await expect(page).toHaveURL(/\/catalog\?focus=search#catalog-search$/);
    await expect(page.locator('#catalog-query')).toBeFocused();
    await expect
      .poll(() =>
        page.locator('#catalog-search').evaluate((form) => {
          const box = form.getBoundingClientRect();
          return (Number(box.top) + Number(box.height) / 2) / Number(window.innerHeight);
        }),
      )
      .toBeGreaterThan(0.57);

    const applyButton = page.getByRole('button', { name: 'اعمال' });
    const restingButtonColors = await applyButton.evaluate((button) => {
      const style = window.getComputedStyle(button);
      const range = document.createRange();
      range.selectNodeContents(button);
      const buttonBox = button.getBoundingClientRect();
      const textBox = range.getBoundingClientRect();
      const ruleStyle = window.getComputedStyle(button, '::after');
      return {
        background: style.backgroundColor,
        color: style.color,
        centerDelta: Math.abs(
          Number(textBox.left) +
            Number(textBox.width) / 2 -
            (Number(buttonBox.left) + Number(buttonBox.width) / 2),
        ),
        ruleWidth: Number.parseFloat(ruleStyle.inlineSize),
        textWidth: Number(textBox.width),
      };
    });
    expect(restingButtonColors.centerDelta).toBeLessThanOrEqual(1);
    expect(restingButtonColors.ruleWidth).toBeGreaterThan(restingButtonColors.textWidth);
    expect(restingButtonColors.ruleWidth - restingButtonColors.textWidth).toBeLessThan(12);
    await applyButton.hover();
    await expect(applyButton).toHaveCSS('background-color', restingButtonColors.background);
    await expect(applyButton).toHaveCSS('color', restingButtonColors.color);
    await expect
      .poll(() =>
        applyButton.evaluate((button) =>
          Number(new DOMMatrix(window.getComputedStyle(button, '::after').transform).a),
        ),
      )
      .toBeGreaterThan(0.9);

    await page.locator('.back-to-top').click();
    await page.waitForFunction(() => window.scrollY < 2);
    await expect(page.locator('.back-to-top')).toHaveAccessibleName('بازگشت به بالای صفحه');

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(e2eUrls.storefront);
    await page.locator('.mobile-menu-trigger').click();
    await page.getByRole('link', { name: 'جست‌وجوی محصولات' }).click();
    await expect(page).toHaveURL(/\/catalog\?focus=search#catalog-search$/);
    await expect(page.locator('#catalog-query')).toBeFocused();
  });

  test('responsive menu and cart reserve directional motion for desktop', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(e2eUrls.storefront);
    await page.locator('.mobile-menu-trigger').click();
    const menuOverlay = page.locator('.mobile-navigation-overlay');
    const menuPanel = page.locator('.mobile-navigation-panel');
    await expect(menuPanel).toHaveCSS('background-color', 'rgb(245, 239, 231)');
    await expect(menuPanel).toHaveCSS('animation-name', 'kele-panel-fade-in');
    await expect
      .poll(() =>
        page
          .locator('.mobile-primary-links a')
          .first()
          .evaluate((link) => ({
            display: window.getComputedStyle(link, '::after').display,
            content: window.getComputedStyle(link, '::after').content,
          })),
      )
      .toMatchObject({ display: 'none' });
    const menuClose = page.locator('.mobile-navigation-panel .header-icon-button');
    const menuCloseBox = await menuClose.boundingBox();
    if (!menuCloseBox) throw new Error('Mobile menu close control is missing');
    await menuClose.click();
    await expect(menuOverlay).toHaveClass(/is-closing/);
    await expect(menuPanel).toHaveCSS('animation-name', 'kele-panel-fade-out');
    await expect(menuOverlay).toBeHidden();

    await page.locator('.header-cart-button').click();
    const cartOverlay = page.locator('.cart-overlay');
    const cartDrawer = page.locator('.cart-drawer');
    await expect(cartDrawer).toHaveCSS('animation-name', 'kele-panel-fade-in');
    const cartCloseBox = await page.locator('.cart-drawer-close').boundingBox();
    if (!cartCloseBox) throw new Error('Cart close control is missing');
    expect(Math.abs(cartCloseBox.x - menuCloseBox.x)).toBeLessThanOrEqual(1);
    expect(Math.abs(cartCloseBox.y - menuCloseBox.y)).toBeLessThanOrEqual(1);
    await page.locator('.cart-drawer-close').click();
    await expect(cartOverlay).toHaveClass(/is-closing/);
    await expect(cartDrawer).toHaveCSS('animation-name', 'kele-panel-fade-out');
    await expect(cartOverlay).toBeHidden();

    await page.setViewportSize({ width: 768, height: 1024 });
    await page.locator('.header-cart-button').click();
    await expect(cartDrawer).toHaveCSS('animation-name', 'kele-panel-fade-in');
    await page.locator('.cart-drawer-close').click();
    await expect(cartDrawer).toHaveCSS('animation-name', 'kele-panel-fade-out');
    await expect(cartOverlay).toBeHidden();

    await page.setViewportSize({ width: 1024, height: 800 });
    await page.locator('.header-cart-button').click();
    await expect(cartDrawer).toHaveCSS('animation-name', 'cart-drawer-in');
    await page.locator('.cart-drawer-close').click();
    await expect(cartDrawer).toHaveCSS('animation-name', 'cart-drawer-out');
    await expect(cartOverlay).toBeHidden();
  });

  test('desktop Product detail keeps the restrained gallery on the left', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`${e2eUrls.storefront}/products/beige-linen-suit`);
    const galleryBox = await page
      .locator('.product-gallery')
      .filter({ visible: true })
      .boundingBox();
    const purchaseBox = await page
      .locator('.purchase-panel')
      .filter({ visible: true })
      .boundingBox();
    const primaryBox = await page
      .locator('.gallery-primary')
      .filter({ visible: true })
      .boundingBox();
    const thumbnailsBox = await page
      .locator('.gallery-thumbnails')
      .filter({ visible: true })
      .boundingBox();
    if (!galleryBox || !purchaseBox || !primaryBox || !thumbnailsBox) {
      throw new Error('Product detail layout is incomplete');
    }
    expect(galleryBox.x).toBeLessThan(purchaseBox.x);
    expect(thumbnailsBox.x).toBeLessThan(primaryBox.x);
    expect(galleryBox.width).toBeLessThan(650);
    expect(primaryBox.width).toBeLessThan(550);

    await page.goto(`${e2eUrls.storefront}/outfits/calm-linen-look`);
    const outfitGallery = await page
      .locator('.outfit-detail-hero .product-gallery')
      .filter({ visible: true })
      .boundingBox();
    const outfitCopy = await page
      .locator('.outfit-detail-copy')
      .filter({ visible: true })
      .boundingBox();
    const outfitPrimary = await page
      .locator('.outfit-detail-hero .gallery-primary')
      .filter({ visible: true })
      .boundingBox();
    const outfitThumbnails = await page
      .locator('.outfit-detail-hero .gallery-thumbnails')
      .filter({ visible: true })
      .boundingBox();
    if (!outfitGallery || !outfitCopy || !outfitPrimary || !outfitThumbnails) {
      throw new Error('Outfit detail layout is incomplete');
    }
    expect(outfitGallery.x).toBeLessThan(outfitCopy.x);
    expect(outfitThumbnails.x).toBeLessThan(outfitPrimary.x);
    expect(outfitGallery.width).toBeLessThan(650);
  });

  test('mobile Product information keeps an editorial reading order without overflow', async ({
    page,
    request,
  }) => {
    const productResponse = await request.get(`${e2eUrls.api}/catalog/products/beige-linen-suit`);
    expect(productResponse.ok()).toBe(true);
    const product = (await productResponse.json()) as { details?: string[] };
    const detailCount = product.details?.length ?? 0;

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${e2eUrls.storefront}/products/beige-linen-suit`);

    const information = page.locator('.product-information').filter({ visible: true });
    await expect(information).toBeVisible();
    await expect(information).toHaveCSS('background-color', 'rgb(251, 247, 241)');
    await expect(information.locator('.product-information-heading')).toHaveCount(
      detailCount > 0 ? 2 : 1,
    );
    await expect(information.locator('li')).toHaveCount(detailCount);
    await expect(information.locator('.product-information-index')).toHaveCount(
      detailCount > 0 ? 2 : 1,
    );
    await expect(information.locator('.product-detail-index')).toHaveCount(detailCount);
    for (const decorativeNumber of await information
      .locator('.product-information-index, .product-detail-index')
      .all()) {
      await expect(decorativeNumber).toHaveAttribute('aria-hidden', 'true');
    }

    expect(
      await information.evaluate((element) => {
        const rect = element.getBoundingClientRect();
        const viewportWidth = document.documentElement.clientWidth;
        return {
          fullBleed: Math.abs(rect.width - viewportWidth) <= 1 && Math.abs(rect.x) <= 1,
          noPageOverflow: document.documentElement.scrollWidth <= viewportWidth,
          singleColumn:
            getComputedStyle(element).gridTemplateColumns.trim().split(/\s+/).length === 1,
        };
      }),
    ).toEqual({ fullBleed: true, noPageOverflow: true, singleColumn: true });
  });

  test('Product detail keeps every color image reachable and supports RTL mobile swipe', async ({
    page,
    request,
  }) => {
    const productResponse = await request.get(`${e2eUrls.api}/catalog/products/beige-linen-suit`);
    expect(productResponse.ok()).toBe(true);
    const product = (await productResponse.json()) as {
      variants: Array<{ id: string; gallery: Array<{ id: string }> }>;
    };
    const expectedImageCount = product.variants.reduce(
      (count, variant) => count + variant.gallery.length,
      0,
    );

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${e2eUrls.storefront}/products/beige-linen-suit`);

    const thumbnails = page.locator('.gallery-thumbnails button');
    await expect(thumbnails).toHaveCount(expectedImageCount);
    for (const variant of product.variants) {
      await expect(page.locator(`[data-gallery-group="${variant.id}"]`)).toHaveCount(
        variant.gallery.length,
      );
    }

    const primary = page.locator('.gallery-primary');
    const primaryBoxBeforeSwipe = await primary.boundingBox();
    if (!primaryBoxBeforeSwipe) throw new Error('Product gallery primary image is not visible');
    await expect(primary).toHaveCSS('touch-action', 'pan-y pinch-zoom');
    await expect(thumbnails.nth(0)).toHaveAttribute('aria-pressed', 'true');
    await primary.dispatchEvent('touchstart', {
      touches: [{ identifier: 1, clientX: 80, clientY: 220 }],
    });
    await primary.dispatchEvent('touchend', {
      changedTouches: [{ identifier: 1, clientX: 240, clientY: 224 }],
      touches: [],
    });
    await expect(thumbnails.nth(1)).toHaveAttribute('aria-pressed', 'true');
    await expect(primary.locator('.gallery-primary-image')).toHaveAttribute(
      'data-motion',
      'forward',
    );
    await expect(primary.locator('.gallery-primary-image')).toHaveCSS(
      'animation-name',
      'gallery-media-reveal-forward',
    );
    expect((await primary.boundingBox())?.y).toBe(primaryBoxBeforeSwipe.y);

    await primary.dispatchEvent('touchstart', {
      touches: [{ identifier: 2, clientX: 240, clientY: 224 }],
    });
    await primary.dispatchEvent('touchend', {
      changedTouches: [{ identifier: 2, clientX: 80, clientY: 220 }],
      touches: [],
    });
    await expect(thumbnails.nth(0)).toHaveAttribute('aria-pressed', 'true');
    await expect(primary.locator('.gallery-primary-image')).toHaveAttribute(
      'data-motion',
      'backward',
    );
    await expect(primary.locator('.gallery-primary-image')).toHaveCSS(
      'animation-name',
      'gallery-media-reveal-backward',
    );

    await primary.dispatchEvent('touchstart', {
      touches: [{ identifier: 3, clientX: 180, clientY: 180 }],
    });
    await primary.dispatchEvent('touchend', {
      changedTouches: [{ identifier: 3, clientX: 188, clientY: 300 }],
      touches: [],
    });
    await expect(thumbnails.nth(0)).toHaveAttribute('aria-pressed', 'true');

    await page.setViewportSize({ width: 1440, height: 900 });
    await page.reload();
    const desktopThumbnails = page.locator('.gallery-thumbnails button');
    await desktopThumbnails.nth(1).click();
    await expect(page.locator('.gallery-primary-image')).toHaveCSS(
      'animation-name',
      'gallery-media-fade',
    );
  });

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
