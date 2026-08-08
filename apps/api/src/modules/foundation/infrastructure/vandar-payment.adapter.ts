import { createHash } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { ApplicationError } from '../../../shared/application-error.js';
import type { PaymentGateway, PaymentIntent } from '../application/payment-gateway.port.js';
import { providerFetch, providerJson, type ProviderFetch } from './provider-http.js';
import type { VerifiedPaymentCallback } from '../../checkout/domain/checkout.types.js';

type VandarIntentResponse = Readonly<{ status?: number; token?: string }>;
type VandarTransactionResponse = Readonly<{
  status?: number;
  amount?: string | number;
  transId?: string | number;
  code?: number;
  paymentDate?: string;
}>;

function objectValue(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : null;
}

function positiveInteger(value: unknown): number | null {
  const parsed =
    typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : NaN;
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

@Injectable()
export class VandarPaymentAdapter implements PaymentGateway {
  readonly provider = 'vandar';

  constructor(
    private readonly apiKey: string,
    private readonly callbackBaseUrl: string,
    private readonly timeoutMs: number,
    private readonly fetcher: ProviderFetch = fetch,
    private readonly ipgBaseUrl = 'https://ipg.vandar.io',
  ) {}

  async createIntent(input: {
    applicationReference: string;
    paymentAttemptId: string;
    amountRial: number;
    currency: 'IRR';
    returnBaseUrl: string;
    correlationId: string;
  }): Promise<PaymentIntent> {
    if (!Number.isSafeInteger(input.amountRial) || input.amountRial < 1_000) {
      throw new Error('Vandar requires an integer IRR amount of at least 1000.');
    }
    const callbackUrl = `${this.callbackBaseUrl.replace(/\/$/, '')}/payment-callbacks/vandar`;
    const response = await providerFetch(
      this.fetcher,
      `${this.ipgBaseUrl.replace(/\/$/, '')}/api/v3/send`,
      {
        method: 'POST',
        headers: { accept: 'application/json', 'content-type': 'application/json' },
        body: JSON.stringify({
          api_key: this.apiKey,
          amount: input.amountRial,
          callback_url: callbackUrl,
          factorNumber: input.applicationReference,
        }),
      },
      this.timeoutMs,
    );
    const body = (await providerJson(response)) as VandarIntentResponse;
    if (body.status !== 1 || typeof body.token !== 'string' || body.token.length < 8) {
      throw new Error('Vandar rejected the payment intent.');
    }
    return {
      provider: this.provider,
      reference: body.token,
      redirectUrl: `${this.ipgBaseUrl.replace(/\/$/, '')}/v3/${encodeURIComponent(body.token)}`,
      status: 'created',
    };
  }

  async verifyCallback(input: {
    authenticator: string;
    payload: unknown;
    now: Date;
  }): Promise<VerifiedPaymentCallback> {
    const payload = objectValue(input.payload);
    const token = payload?.token;
    const paymentStatus = payload?.paymentStatus;
    if (
      typeof token !== 'string' ||
      token.length < 8 ||
      token !== input.authenticator ||
      (paymentStatus !== 'OK' && paymentStatus !== 'NOK')
    ) {
      throw new ApplicationError(
        'forbidden',
        'PAYMENT_CALLBACK_UNVERIFIED',
        'Payment callback payload failed provider validation.',
      );
    }

    const transaction = await this.transaction(token);
    let verified = transaction;
    if (paymentStatus === 'OK' && transaction.code === 1) verified = await this.verify(token);

    const amountRial = positiveInteger(verified.amount);
    const transactionId = verified.transId;
    if (
      verified.status !== 1 ||
      amountRial === null ||
      (typeof transactionId !== 'string' && typeof transactionId !== 'number')
    ) {
      throw new ApplicationError(
        'forbidden',
        'PAYMENT_CALLBACK_UNVERIFIED',
        'Payment callback could not be verified with the provider.',
      );
    }

    const status: VerifiedPaymentCallback['status'] =
      paymentStatus === 'OK' && (verified.code === undefined || [1, 2].includes(verified.code))
        ? 'success'
        : paymentStatus === 'NOK'
          ? 'cancelled'
          : 'failed';
    const canonical = JSON.stringify({
      amountRial,
      paymentStatus,
      token,
      transactionId: String(transactionId),
    });
    return {
      provider: this.provider,
      providerReference: token,
      providerTransactionId: String(transactionId),
      status,
      amountRial,
      currency: 'IRR',
      issuedAt: input.now.toISOString(),
      nonce: token,
      payloadHash: createHash('sha256').update(canonical).digest('hex'),
    };
  }

  private async transaction(token: string): Promise<VandarTransactionResponse> {
    return this.post('/api/v3/transaction', token);
  }

  private async verify(token: string): Promise<VandarTransactionResponse> {
    return this.post('/api/v3/verify', token);
  }

  private async post(path: string, token: string): Promise<VandarTransactionResponse> {
    const response = await providerFetch(
      this.fetcher,
      `${this.ipgBaseUrl.replace(/\/$/, '')}${path}`,
      {
        method: 'POST',
        headers: { accept: 'application/json', 'content-type': 'application/json' },
        body: JSON.stringify({ api_key: this.apiKey, token }),
      },
      this.timeoutMs,
    );
    return (await providerJson(response)) as VandarTransactionResponse;
  }
}
