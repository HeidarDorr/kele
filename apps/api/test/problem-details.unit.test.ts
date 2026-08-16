import { BadRequestException, type ArgumentsHost } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { ProblemDetailsFilter } from '../src/modules/catalog/presentation/problem-details.filter.js';
import type { JsonLogger } from '../src/platform/observability/json.logger.js';
import type { OperationalTelemetry } from '../src/shared/operational-telemetry.js';

describe('ProblemDetailsFilter', () => {
  it('جزئیات validation را به‌جای عنوان عمومی Bad Request برمی‌گرداند', () => {
    const send = vi.fn();
    const response = {
      setHeader: vi.fn(),
      status: vi.fn().mockReturnThis(),
      type: vi.fn().mockReturnThis(),
      send,
    };
    const host = {
      switchToHttp: () => ({ getResponse: () => response }),
    } as unknown as ArgumentsHost;
    const filter = new ProblemDetailsFilter({ error: vi.fn() } as unknown as JsonLogger, {
      record: vi.fn(),
    } satisfies OperationalTelemetry);

    filter.catch(
      new BadRequestException([
        'variants.1.mediaIds must contain at least 1 elements',
        'variants.1.featuredMediaId must be a UUID',
      ]),
      host,
    );

    expect(response.status).toHaveBeenCalledWith(400);
    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 'REQUEST_VALIDATION_FAILED',
        title: 'Request validation failed',
        detail:
          'variants.1.mediaIds must contain at least 1 elements variants.1.featuredMediaId must be a UUID',
      }),
    );
  });
});
