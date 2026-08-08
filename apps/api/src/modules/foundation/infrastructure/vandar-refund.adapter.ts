import { Injectable } from '@nestjs/common';
import type { RefundGateway, RefundProviderResult } from '../application/refund-gateway.port.js';
import { providerFetch, providerJson, type ProviderFetch } from './provider-http.js';

type RefundItem = Readonly<{ id?: string }>;
type VandarRefundResponse = Readonly<{
  status?: number;
  data?: Readonly<{ results?: readonly RefundItem[] }>;
}>;

@Injectable()
export class VandarRefundAdapter implements RefundGateway {
  readonly provider = 'vandar';

  constructor(
    private readonly accessToken: string,
    private readonly businessName: string,
    private readonly timeoutMs: number,
    private readonly fetcher: ProviderFetch = fetch,
    private readonly apiBaseUrl = 'https://api.vandar.io',
  ) {}

  async requestRefund(input: {
    providerTransactionId: string;
    amountRial: number;
    currency: 'IRR';
    idempotencyKey: string;
    correlationId: string;
    requestedAt: Date;
  }): Promise<RefundProviderResult> {
    if (!Number.isSafeInteger(input.amountRial) || input.amountRial <= 0) {
      return {
        provider: this.provider,
        providerReference: '',
        status: 'failed',
        confirmedAt: null,
        failureCode: 'INVALID_REFUND_AMOUNT',
      };
    }
    const endpoint = `${this.apiBaseUrl.replace(/\/$/, '')}/v3/business/${encodeURIComponent(this.businessName)}/transaction/${encodeURIComponent(input.providerTransactionId)}/refund`;
    try {
      const response = await providerFetch(
        this.fetcher,
        endpoint,
        {
          method: 'POST',
          headers: {
            accept: 'application/json',
            authorization: `Bearer ${this.accessToken}`,
            'content-type': 'application/json',
          },
          body: JSON.stringify({
            payment_number: input.idempotencyKey,
            amount: String(input.amountRial),
            description: `KELE refund ${input.idempotencyKey}`,
          }),
        },
        this.timeoutMs,
      );
      const body = (await providerJson(response)) as VandarRefundResponse;
      const results = body.data?.results;
      const references =
        results?.map((item) => item.id).filter((id): id is string => typeof id === 'string') ?? [];
      if (body.status !== 1 || references.length === 0) throw new Error('Refund rejected.');
      return {
        provider: this.provider,
        providerReference: references.join(','),
        status: 'pending',
        confirmedAt: null,
        failureCode: null,
      };
    } catch {
      return {
        provider: this.provider,
        providerReference: '',
        status: 'failed',
        confirmedAt: null,
        failureCode: 'PROVIDER_REQUEST_FAILED',
      };
    }
  }
}
