import { createHash } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import type { SmsDispatch, SmsGateway } from '../application/sms-gateway.port.js';

@Injectable()
export class FakeSmsAdapter implements SmsGateway {
  readonly provider = 'fake';

  send(
    input: Readonly<{ mobile: string; message: string; correlationId: string }>,
  ): Promise<SmsDispatch> {
    if (!/^\+98\d{10}$/.test(input.mobile)) {
      return Promise.reject(new Error('Fake SMS requires an E.164 Iranian mobile.'));
    }
    if (input.message.trim().length === 0)
      return Promise.reject(new Error('Fake SMS requires a message.'));

    const digest = createHash('sha256').update(input.correlationId).digest('hex').slice(0, 16);
    return Promise.resolve({
      provider: 'fake',
      providerMessageId: `fake-sms-${digest}`,
      accepted: true,
    });
  }
}
