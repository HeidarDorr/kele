import type { NextFunction, Request, Response } from 'express';
import { MetricsService } from './metrics.service.js';

type RoutedRequest = Request & { route?: { path?: unknown } };

export class HttpMetricsMiddleware {
  constructor(private readonly metrics: MetricsService) {}

  use(request: RoutedRequest, response: Response, next: NextFunction): void {
    const startedAt = process.hrtime.bigint();
    this.metrics.incrementGauge('kele_http_in_flight', {}, 1);
    let recorded = false;
    const record = () => {
      if (recorded) return;
      recorded = true;
      this.metrics.incrementGauge('kele_http_in_flight', {}, -1);
      const route = routeLabel(request);
      const labels = {
        method: request.method,
        route,
        status_class: `${String(Math.floor(response.statusCode / 100))}xx`,
      };
      this.metrics.increment('kele_http_requests_total', labels);
      this.metrics.observeDuration(
        'kele_http_request_duration_seconds',
        Number(process.hrtime.bigint() - startedAt) / 1_000_000_000,
        labels,
      );
    };
    response.once('finish', record);
    response.once('close', record);
    next();
  }
}

function routeLabel(request: RoutedRequest): string {
  const route: unknown = (request as unknown as { route?: unknown }).route;
  const path =
    typeof route === 'object' && route !== null && 'path' in route
      ? (route as { path?: unknown }).path
      : undefined;
  if (typeof path !== 'string' || path.length === 0) return 'unmatched';
  return `${request.baseUrl}${path}`.replace(/\/{2,}/g, '/').slice(0, 160);
}
