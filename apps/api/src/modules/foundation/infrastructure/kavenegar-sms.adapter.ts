import { Injectable } from '@nestjs/common';
import type {
  SmsDeliveryStatus,
  SmsDispatch,
  SmsGateway,
} from '../application/sms-gateway.port.js';
import { providerFetch, providerJson, type ProviderFetch } from './provider-http.js';

type KavenegarResponse = Readonly<{
  return?: Readonly<{ status?: number }>;
  entries?: readonly Readonly<{ messageid?: number | string; status?: number }>[];
}>;

function deliveryStatus(value: number): SmsDeliveryStatus['status'] {
  if (value === 10) return 'delivered';
  if ([4, 5].includes(value)) return 'sent';
  if ([1, 2].includes(value)) return 'queued';
  if ([6, 11, 13, 14].includes(value)) return 'failed';
  return 'unknown';
}

@Injectable()
export class KavenegarSmsAdapter implements SmsGateway {
  readonly provider = 'kavenegar';

  constructor(
    private readonly apiKey: string,
    private readonly template: string,
    private readonly timeoutMs: number,
    private readonly fetcher: ProviderFetch = fetch,
    private readonly baseUrl = 'https://api.kavenegar.com',
  ) {}

  async sendOtp(
    input: Readonly<{ mobile: string; code: string; correlationId: string }>,
  ): Promise<SmsDispatch> {
    if (!/^\+98\d{10}$/.test(input.mobile))
      throw new Error('Kavenegar requires an Iranian E.164 mobile.');
    if (!/^\d{6}$/.test(input.code)) throw new Error('Kavenegar requires a six-digit OTP.');

    const receptor = `0${input.mobile.slice(3)}`;
    const query = new URLSearchParams({ receptor, token: input.code, template: this.template });
    const endpoint = `${this.baseUrl.replace(/\/$/, '')}/v1/${encodeURIComponent(this.apiKey)}/verify/lookup.json?${query.toString()}`;
    const response = await providerFetch(
      this.fetcher,
      endpoint,
      { method: 'GET', headers: { accept: 'application/json' } },
      this.timeoutMs,
    );
    const body = (await providerJson(response)) as KavenegarResponse;
    const messageId = body.entries?.[0]?.messageid;
    if (
      body.return?.status !== 200 ||
      (typeof messageId !== 'number' && typeof messageId !== 'string')
    ) {
      throw new Error('Kavenegar rejected the OTP request.');
    }
    return { provider: this.provider, providerMessageId: String(messageId), accepted: true };
  }

  async getDeliveryStatus(providerMessageId: string): Promise<SmsDeliveryStatus> {
    if (!/^\d{1,30}$/.test(providerMessageId)) {
      throw new Error('Kavenegar message identifier is invalid.');
    }
    const query = new URLSearchParams({ messageid: providerMessageId });
    const endpoint = `${this.baseUrl.replace(/\/$/, '')}/v1/${encodeURIComponent(this.apiKey)}/sms/status.json?${query.toString()}`;
    const response = await providerFetch(
      this.fetcher,
      endpoint,
      { method: 'GET', headers: { accept: 'application/json' } },
      this.timeoutMs,
    );
    const body = (await providerJson(response)) as KavenegarResponse;
    const entry = body.entries?.[0];
    if (
      body.return?.status !== 200 ||
      entry === undefined ||
      String(entry.messageid) !== providerMessageId ||
      !Number.isInteger(entry.status)
    ) {
      throw new Error('Kavenegar returned an invalid delivery status response.');
    }
    return {
      provider: this.provider,
      providerMessageId,
      status: deliveryStatus(entry.status as number),
    };
  }
}
