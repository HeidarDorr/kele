import { createHash } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import type {
  SmsDeliveryStatus,
  SmsDispatch,
  SmsGateway,
} from '../application/sms-gateway.port.js';

@Injectable()
export class FakeSmsAdapter implements SmsGateway {
  readonly provider = 'fake';

  sendOtp(
    input: Readonly<{ mobile: string; code: string; correlationId: string }>,
  ): Promise<SmsDispatch> {
    if (!/^\+98\d{10}$/.test(input.mobile)) {
      return Promise.reject(new Error('Fake SMS requires an E.164 Iranian mobile.'));
    }
    if (!/^\d{6}$/.test(input.code))
      return Promise.reject(new Error('Fake SMS requires a six-digit OTP.'));

    const digest = createHash('sha256').update(input.correlationId).digest('hex').slice(0, 16);
    return Promise.resolve({
      provider: 'fake',
      providerMessageId: `fake-sms-${digest}`,
      accepted: true,
    });
  }

  getDeliveryStatus(providerMessageId: string): Promise<SmsDeliveryStatus> {
    if (!/^fake-sms-[0-9a-f]{16}$/.test(providerMessageId)) {
      return Promise.reject(new Error('Fake SMS message identifier is invalid.'));
    }
    return Promise.resolve({
      provider: this.provider,
      providerMessageId,
      status: 'delivered',
    });
  }
}
