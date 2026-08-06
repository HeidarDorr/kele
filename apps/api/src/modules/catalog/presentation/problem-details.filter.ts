import {
  ArgumentsHost,
  Catch,
  HttpException,
  HttpStatus,
  type ExceptionFilter,
} from '@nestjs/common';
import type { Response } from 'express';
import { randomUUID } from 'node:crypto';
import { ApplicationError } from '../../../shared/application-error.js';
import { correlationId } from '../../../platform/observability/correlation-context.js';
import { JsonLogger } from '../../../platform/observability/json.logger.js';
import type { OperationalTelemetry } from '../../../shared/operational-telemetry.js';

const statusByKind: Record<ApplicationError['kind'], number> = {
  not_found: HttpStatus.NOT_FOUND,
  conflict: HttpStatus.CONFLICT,
  validation: HttpStatus.UNPROCESSABLE_ENTITY,
  unauthorized: HttpStatus.UNAUTHORIZED,
  forbidden: HttpStatus.FORBIDDEN,
  rate_limited: HttpStatus.TOO_MANY_REQUESTS,
  dependency: HttpStatus.SERVICE_UNAVAILABLE,
};

@Catch()
export class ProblemDetailsFilter implements ExceptionFilter {
  constructor(
    private readonly logger: JsonLogger,
    private readonly telemetry: OperationalTelemetry,
  ) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    const resolvedCorrelationId = correlationId() ?? randomUUID();
    const transportStatus = transportHttpStatus(exception);
    const status =
      exception instanceof ApplicationError
        ? statusByKind[exception.kind]
        : exception instanceof HttpException
          ? exception.getStatus()
          : (transportStatus ?? HttpStatus.INTERNAL_SERVER_ERROR);
    const code =
      exception instanceof ApplicationError
        ? exception.code
        : status === 400
          ? 'REQUEST_VALIDATION_FAILED'
          : status === 413
            ? 'PAYLOAD_TOO_LARGE'
            : status === 429
              ? 'REQUEST_RATE_LIMITED'
              : status === 401
                ? 'UNAUTHORIZED'
                : status === 403
                  ? 'FORBIDDEN'
                  : 'INTERNAL_ERROR';
    const detail =
      exception instanceof ApplicationError
        ? exception.message
        : exception instanceof HttpException
          ? exception.message
          : transportStatus === 413
            ? 'Request payload exceeds the accepted limit.'
            : transportStatus === 400
              ? 'Request body is invalid.'
              : 'An unexpected error occurred.';
    const errors =
      exception instanceof ApplicationError && exception.errors.length > 0
        ? exception.errors
        : undefined;

    if (exception instanceof ApplicationError && exception.retryAfterSeconds !== undefined) {
      response.setHeader('Retry-After', String(exception.retryAfterSeconds));
    }

    if (status >= 500 || status === 429) {
      this.telemetry.record({ name: 'exception', outcome: code.toLowerCase() });
    }
    if (status >= 500) {
      this.logger.error(
        {
          event: 'request_failed',
          code,
          status,
        },
        undefined,
        'ProblemDetailsFilter',
      );
    }

    response
      .status(status)
      .type('application/problem+json')
      .send({
        type: `https://kele.local/problems/${code.toLocaleLowerCase()}`,
        title: status >= 500 ? 'Internal server error' : detail,
        status,
        detail,
        code,
        correlationId: resolvedCorrelationId,
        ...(errors === undefined ? {} : { errors }),
      });
  }
}

function transportHttpStatus(exception: unknown): number | null {
  if (typeof exception !== 'object' || exception === null || !('status' in exception)) return null;
  const status = (exception as { status?: unknown }).status;
  return typeof status === 'number' && Number.isInteger(status) && status >= 400 && status <= 599
    ? status
    : null;
}
