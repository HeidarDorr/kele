import { expect, type Page } from '@playwright/test';

export async function waitForPageImages(page: Page, timeout = 15_000): Promise<void> {
  await page.locator('img').evaluateAll((images) => {
    for (const image of images as HTMLImageElement[]) image.loading = 'eager';
  });

  await expect
    .poll(
      () =>
        page.locator('img').evaluateAll((images) =>
          (images as HTMLImageElement[])
            .filter(
              (image) => !image.complete || image.naturalWidth === 0 || image.naturalHeight === 0,
            )
            .map((image) => ({
              complete: image.complete,
              height: image.naturalHeight,
              src: image.currentSrc || image.src,
              width: image.naturalWidth,
            })),
        ),
      {
        message: 'Every rendered image must load after lazy images are promoted for evidence.',
        timeout,
      },
    )
    .toEqual([]);

  await page.locator('img').evaluateAll(async (images) => {
    await Promise.all(
      (images as HTMLImageElement[]).map(async (image) => {
        await image.decode();
      }),
    );
  });
}
