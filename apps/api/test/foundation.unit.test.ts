import { describe, expect, it } from 'vitest';
import { FakePaymentAdapter } from '../src/modules/foundation/infrastructure/fake-payment.adapter.js';
import { FakeSmsAdapter } from '../src/modules/foundation/infrastructure/fake-sms.adapter.js';

describe('foundation adapters', () => {
  it('[PAY-001][PAY-003] creates deterministic fake payment references without credentials', async () => {
    const adapter = new FakePaymentAdapter('test-fake-payment-signing-secret-000001');
    await expect(
      adapter.createIntent({
        applicationReference: 'checkout-key',
        paymentAttemptId: '00000000-0000-4000-8000-000000000001',
        amountRial: 1000,
        currency: 'IRR',
        returnBaseUrl: 'http://localhost:3000',
        correlationId: 'test-id',
      }),
    ).resolves.toEqual({
      provider: 'fake',
      reference: 'fake-checkout-key',
      redirectUrl:
        'http://localhost:3000/payment/fake?attempt=00000000-0000-4000-8000-000000000001',
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
