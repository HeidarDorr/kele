import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { expect, test, type APIResponse, type Page } from '@playwright/test';
import { e2eUrls } from './ports.mts';

const metricsToken = process.env.METRICS_BEARER_TOKEN ?? 'development-metrics-bearer-token-000001';
const superSession =
  process.env.ADMIN_SUPER_SESSION_TOKEN ?? 'development-super-admin-session-token-00000001';
const acceptanceViewports = [
  { name: 'mobile', width: 390, height: 844 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'small-laptop', width: 1280, height: 800 },
  { name: 'desktop', width: 1440, height: 900 },
] as const;

test.describe.serial('Milestone 9 production-like operational acceptance', () => {
  test('[M9-AC-010][M9-AC-012][M9-AC-014] API headers, bounds, CORS and metrics fail closed', async ({
    request,
  }) => {
    const correlation = '90000000-0000-4000-8000-000000000001';
    const live = await request.get(`${e2eUrls.api}/health/live`, {
      headers: { 'x-correlation-id': correlation },
    });
    expect(live.status()).toBe(200);
    expect(live.headers()['x-correlation-id']).toBe(correlation);
    expect(live.headers()['x-content-type-options']).toBe('nosniff');
    expect(live.headers()['x-frame-options']).toBe('DENY');
    expect(live.headers()['referrer-policy']).toBe('no-referrer');
    expect(live.headers()['content-security-policy']).toContain("frame-ancestors 'none'");
    expect(live.headers()['cache-control']).toBe('no-store');

    const deniedMetrics = await request.get(`${e2eUrls.api}/metrics`);
    expect(deniedMetrics.status()).toBe(401);
    expect(await deniedMetrics.text()).not.toContain(metricsToken);

    let metrics: APIResponse | undefined;
    await expect
      .poll(
        async () => {
          metrics = await request.get(`${e2eUrls.api}/metrics`, {
            headers: { authorization: `Bearer ${metricsToken}` },
          });
          return metrics.status();
        },
        { message: 'Operational metrics must recover from a bounded transient snapshot timeout.' },
      )
      .toBe(200);
    if (metrics === undefined) throw new Error('Operational metrics response was not captured.');
    const metricsBody = await metrics.text();
    expect(metricsBody).toContain('kele_database_ready 1');
    expect(metricsBody).toContain('kele_http_requests_total');
    expect(metricsBody).not.toContain(metricsToken);
    expect(metricsBody).not.toContain('customerId');
    expect(metrics.headers()['cache-control']).toBe('no-store');

    const hostilePreflight = await request.fetch(`${e2eUrls.api}/auth/otp/challenges`, {
      method: 'OPTIONS',
      headers: {
        origin: 'https://hostile.invalid',
        'access-control-request-method': 'POST',
      },
    });
    expect(hostilePreflight.headers()['access-control-allow-origin']).toBeUndefined();

    const oversized = await request.post(`${e2eUrls.api}/auth/otp/challenges`, {
      data: { mobile: '9'.repeat(140_000) },
      headers: { 'x-correlation-id': '90000000-0000-4000-8000-000000000002' },
    });
    expect(oversized.status()).toBe(413);
    expect(await oversized.json()).toMatchObject({
      code: 'PAYLOAD_TOO_LARGE',
      correlationId: '90000000-0000-4000-8000-000000000002',
    });
  });

  test('[M9-AC-007][M9-AC-009][OQ-018] administration rejects unauthorized and remote Media', async ({
    request,
  }) => {
    const anonymous = await request.get(`${e2eUrls.api}/admin/media`);
    expect(anonymous.status()).toBe(401);

    const remoteMedia = await request.post(`${e2eUrls.api}/admin/media`, {
      headers: {
        cookie: `kele_session=${encodeURIComponent(superSession)}`,
        'x-correlation-id': '90000000-0000-4000-8000-000000000003',
      },
      data: {
        url: 'https://unapproved-cdn.invalid/catalog/item.webp',
        width: 1600,
        height: 2400,
        alt: 'تصویر آزمون',
        format: 'webp',
        group: 'product_images',
        focalPoint: { x: 0.5, y: 0.5 },
      },
    });
    expect(remoteMedia.status()).toBe(400);
    expect(await remoteMedia.json()).toMatchObject({ code: 'REQUEST_VALIDATION_FAILED' });
  });

  test('[M9-AC-020][M9-AC-027] customer and administration production builds meet smoke budgets', async ({
    page,
  }, testInfo) => {
    await installPerformanceObserver(page);
    const viewportEvidence: Record<
      string,
      {
        width: number;
        height: number;
        storefront: Awaited<ReturnType<typeof readPerformance>> & { noHorizontalOverflow: true };
        administration: { noHorizontalOverflow: true };
      }
    > = {};
    for (const viewport of acceptanceViewports) {
      await page.setViewportSize(viewport);
      const storefrontResponse = await page.goto(e2eUrls.storefront, {
        waitUntil: 'networkidle',
      });
      expect(storefrontResponse?.status()).toBe(200);
      await expect(page.locator('html')).toHaveAttribute('lang', 'fa-IR');
      await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
      expect(storefrontResponse?.headers()['x-frame-options']).toBe('DENY');
      expect(storefrontResponse?.headers()['content-security-policy']).toContain(
        "frame-ancestors 'none'",
      );
      const storefrontPerformance = await readPerformance(page);
      expect(storefrontPerformance.cls).toBeLessThanOrEqual(0.1);
      expect(storefrontPerformance.lcpMs).toBeLessThanOrEqual(2_500);
      expect(storefrontPerformance.domContentLoadedMs).toBeLessThanOrEqual(2_500);
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
      ).toBe(true);

      const adminResponse = await page.goto(e2eUrls.admin, { waitUntil: 'networkidle' });
      expect(adminResponse?.status()).toBe(200);
      await expect(page.locator('html')).toHaveAttribute('lang', 'fa-IR');
      await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
      expect(adminResponse?.headers()['x-frame-options']).toBe('DENY');
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
      ).toBe(true);

      viewportEvidence[viewport.name] = {
        width: viewport.width,
        height: viewport.height,
        storefront: { ...storefrontPerformance, noHorizontalOverflow: true },
        administration: { noHorizontalOverflow: true },
      };
    }

    await testInfo.attach('milestone-9-performance.json', {
      body: Buffer.from(JSON.stringify({ viewports: viewportEvidence }, null, 2)),
      contentType: 'application/json',
    });
    const evidenceDirectory = resolve('output/playwright/.e2e-run/milestone-9');
    await mkdir(evidenceDirectory, { recursive: true });
    await writeFile(
      resolve(evidenceDirectory, 'browser.json'),
      `${JSON.stringify(
        {
          schemaVersion: 1,
          productionBuilds: true,
          locale: 'fa-IR',
          direction: 'rtl',
          viewports: viewportEvidence,
          inp: {
            observed: false,
            reason: 'No qualifying interaction occurred in smoke navigation.',
          },
          completedAt: new Date().toISOString(),
        },
        null,
        2,
      )}\n`,
      'utf8',
    );
  });
});

async function installPerformanceObserver(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const state = { cls: 0, lcpMs: 0 };
    (window as unknown as { __keleM9Performance: typeof state }).__keleM9Performance = state;
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const shift = entry as PerformanceEntry & { hadRecentInput?: boolean; value?: number };
        if (!shift.hadRecentInput) state.cls += shift.value ?? 0;
      }
    }).observe({ type: 'layout-shift', buffered: true });
    new PerformanceObserver((list) => {
      const entry = list.getEntries().at(-1);
      if (entry !== undefined) state.lcpMs = entry.startTime;
    }).observe({ type: 'largest-contentful-paint', buffered: true });
  });
}

async function readPerformance(page: Page) {
  await page.waitForTimeout(500);
  return page.evaluate(() => {
    const navigation = performance.getEntriesByType('navigation')[0] as
      { domContentLoadedEventEnd: number } | undefined;
    const state = (window as unknown as { __keleM9Performance?: { cls: number; lcpMs: number } })
      .__keleM9Performance ?? { cls: 0, lcpMs: 0 };
    return {
      cls: Number(state.cls.toFixed(4)),
      lcpMs: Math.round(state.lcpMs),
      domContentLoadedMs: Math.round(navigation?.domContentLoadedEventEnd ?? 0),
    };
  });
}
