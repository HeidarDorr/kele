import { createHash } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import type { RefundGateway, RefundProviderResult } from '../application/refund-gateway.port.js';

@Injectable()
export class FakeRefundAdapter implements RefundGateway {
  readonly provider = 'fake';

  requestRefund(input: {
    providerTransactionId: string;
    amountRial: number;
    currency: 'IRR';
    idempotencyKey: string;
    correlationId: string;
    requestedAt: Date;
  }): Promise<RefundProviderResult> {
    if (!Number.isSafeInteger(input.amountRial) || input.amountRial <= 0) {
      return Promise.resolve({
        provider: 'fake',
        providerReference: '',
        status: 'failed',
        confirmedAt: null,
        failureCode: 'INVALID_REFUND_AMOUNT',
      });
    }
    const digest = createHash('sha256')
      .update(`${input.providerTransactionId}:${input.idempotencyKey}:${String(input.amountRial)}`)
      .digest('hex')
      .slice(0, 24);
    return Promise.resolve({
      provider: 'fake',
      providerReference: `fake-refund-${digest}`,
      status: 'confirmed',
      confirmedAt: input.requestedAt,
      failureCode: null,
    });
  }
}
