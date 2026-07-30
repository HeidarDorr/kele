import { describe, expect, it } from 'vitest';
import { FakePaymentAdapter } from '../src/modules/foundation/infrastructure/fake-payment.adapter.js';
import { FakeSmsAdapter } from '../src/modules/foundation/infrastructure/fake-sms.adapter.js';

describe('foundation adapters', () => {
  it('[PAY-001][PAY-003] creates deterministic fake payment references without credentials', async () => {
    const adapter = new FakePaymentAdapter();
    await expect(
      adapter.createIntent({ amountIrr: 1000, correlationId: 'test-id' }),
    ).resolves.toEqual({
      reference: 'fake-pay-test-id',
      amountIrr: 1000,
      status: 'created',
    });
  });

  it('[SMS-001][SMS-002] accepts a valid fake SMS request and rejects invalid mobile input', async () => {
    const adapter = new FakeSmsAdapter();
    await expect(
      adapter.send({ mobile: '+989121234567', message: '123456', correlationId: 'test-id' }),
    ).resolves.toMatchObject({ accepted: true });
    await expect(
      adapter.send({ mobile: '09121234567', message: '123456', correlationId: 'test-id' }),
    ).rejects.toThrow('E.164');
  });
});
