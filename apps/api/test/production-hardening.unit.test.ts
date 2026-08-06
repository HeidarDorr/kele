import type { ExecutionContext } from '@nestjs/common';
import { UnauthorizedException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { mediaReferenceIssues } from '../src/modules/catalog/domain/media-reference.js';
import { FixedWindowRateLimiter } from '../src/platform/security/fixed-window-rate-limiter.js';
import { SecurityHeadersMiddleware } from '../src/platform/security/security-headers.middleware.js';
import { MetricsAuthGuard } from '../src/platform/observability/metrics-auth.guard.js';
import { MetricsService } from '../src/platform/observability/metrics.service.js';
import {
  redactTelemetry,
  redactTelemetryText,
} from '../src/platform/observability/safe-telemetry.js';

describe('Milestone 9 production hardening', () => {
  it('[M9-AC-005][M9-AC-012] recursively redacts secret and personal telemetry', () => {
    const circular: Record<string, unknown> = {
      mobile: '+989121234567',
      nested: {
        authorization: 'Bearer visible-secret',
        note: 'token=visible-secret +989121234567',
      },
    };
    circular.self = circular;

    const serialized = JSON.stringify(redactTelemetry(circular));
    expect(serialized).not.toContain('visible-secret');
    expect(serialized).not.toContain('+989121234567');
    expect(serialized).toContain('[REDACTED]');
    expect(redactTelemetryText('cookie=session-value')).toBe('cookie=[REDACTED]');
  });

  it('[M9-AC-011] limits hashed risk keys, expires windows and fails closed on saturation', () => {
    let now = 1_000;
    const limiter = new FixedWindowRateLimiter(
      'test-privacy-secret-00000000000000001',
      2,
      () => now,
    );

    expect(limiter.consume('callback', '203.0.113.1', 2, 60_000).allowed).toBe(true);
    expect(limiter.consume('callback', '203.0.113.1', 2, 60_000).allowed).toBe(true);
    expect(limiter.consume('callback', '203.0.113.1', 2, 60_000)).toMatchObject({
      allowed: false,
      retryAfterSeconds: 60,
    });
    expect(limiter.consume('callback', '203.0.113.2', 2, 60_000).allowed).toBe(true);
    expect(limiter.consume('callback', '203.0.113.3', 2, 60_000).allowed).toBe(false);
    expect(limiter.sizeForTest()).toBe(2);

    now += 60_001;
    expect(limiter.consume('callback', '203.0.113.3', 2, 60_000).allowed).toBe(true);
    expect(limiter.sizeForTest()).toBe(1);
  });

  it('[M9-AC-009][OQ-018] accepts bounded same-origin Media and rejects remote or mismatched data', () => {
    expect(
      mediaReferenceIssues({
        url: '/media/catalog/coat-front.webp',
        width: 1_600,
        height: 2_400,
        alt: 'نمای روبه‌روی کت',
        format: 'webp',
        group: 'product_images',
        focalPoint: { x: 0.5, y: 0.5 },
      }),
    ).toEqual([]);
    expect(
      mediaReferenceIssues({
        url: 'https://unapproved.example/asset.svg',
        width: 20_000,
        height: 20_000,
        alt: ' bad\u0000',
        format: 'png',
        group: 'product_images',
        focalPoint: { x: 0.5, y: 0.5 },
      }),
    ).toHaveLength(3);
  });

  it('[M9-AC-010] emits defensive API headers and enables HSTS only in production', () => {
    const headers = new Map<string, string>();
    const response = {
      setHeader: (name: string, value: string) => headers.set(name, value),
    };
    let continued = false;
    new SecurityHeadersMiddleware(false).use({} as never, response as never, () => {
      continued = true;
    });
    expect(continued).toBe(true);
    expect(headers.get('Content-Security-Policy')).toContain("frame-ancestors 'none'");
    expect(headers.get('X-Content-Type-Options')).toBe('nosniff');
    expect(headers.has('Strict-Transport-Security')).toBe(false);

    new SecurityHeadersMiddleware(true).use({} as never, response as never, () => undefined);
    expect(headers.get('Strict-Transport-Security')).toContain('max-age=31536000');
  });

  it('[M9-AC-014] renders bounded Prometheus counters, gauges and histograms', () => {
    const metrics = new MetricsService();
    metrics.increment('kele_http_requests_total', {
      method: 'GET',
      route: '/catalog/products/:slug',
      status_class: '2xx',
    });
    metrics.gauge('kele_database_ready', 1);
    metrics.observeDuration('kele_http_request_duration_seconds', 0.125, {
      method: 'GET',
      route: '/catalog/products/:slug',
      status_class: '2xx',
    });

    const output = metrics.render();
    expect(output).toContain('kele_http_requests_total');
    expect(output).toContain('route="/catalog/products/:slug"');
    expect(output).toContain('kele_database_ready 1');
    expect(output).toContain('kele_http_request_duration_seconds_bucket');
    expect(output).not.toContain('customerId');
  });

  it('[M9-AC-014] protects metrics with a dedicated opaque bearer credential', () => {
    const fixtureCredential = 'test-metrics-bearer-token-000000000001';
    const guard = new MetricsAuthGuard(fixtureCredential);
    expect(guard.canActivate(metricsContext(`Bearer ${fixtureCredential}`))).toBe(true);
    expect(() => guard.canActivate(metricsContext('Bearer incorrect'))).toThrow(
      UnauthorizedException,
    );
    expect(() => guard.canActivate(metricsContext(undefined))).toThrow(UnauthorizedException);
  });
});

function metricsContext(authorization: string | undefined): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ headers: { authorization } }),
      getResponse: () => ({}),
      getNext: () => undefined,
    }),
    getHandler: () => metricsContext,
    getClass: () => metricsContext,
  } as unknown as ExecutionContext;
}
