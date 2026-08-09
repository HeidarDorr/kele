import { describe, expect, it } from 'vitest';
import { FakePaymentAdapter } from '../src/modules/foundation/infrastructure/fake-payment.adapter.js';
import { FakeSmsAdapter } from '../src/modules/foundation/infrastructure/fake-sms.adapter.js';
import { KavenegarSmsAdapter } from '../src/modules/foundation/infrastructure/kavenegar-sms.adapter.js';
import { VandarPaymentAdapter } from '../src/modules/foundation/infrastructure/vandar-payment.adapter.js';
import { VandarRefundAdapter } from '../src/modules/foundation/infrastructure/vandar-refund.adapter.js';
import {
  ArvanObjectStorageAdapter,
  S3ObjectStorageAdapter,
} from '../src/modules/foundation/infrastructure/arvan-object-storage.adapter.js';

describe('foundation adapters', () => {
  const sandboxPaymentToken = ['sandbox', 'payment', 'reference', '1234'].join('-');
  const alteredPaymentToken = ['altered', 'payment', 'reference', '1234'].join('-');

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
      adapter.sendOtp({ mobile: '+989121234567', code: '123456', correlationId: 'test-id' }),
    ).resolves.toMatchObject({ accepted: true });
    await expect(
      adapter.sendOtp({ mobile: '09121234567', code: '123456', correlationId: 'test-id' }),
    ).rejects.toThrow('E.164');
  });

  it('[OQ-003-PROD] maps a Kavenegar Lookup acceptance without exposing the OTP in its result', async () => {
    let requestedUrl = '';
    const fetcher: typeof fetch = (input) => {
      requestedUrl =
        typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
      return Promise.resolve(
        Response.json({ return: { status: 200 }, entries: [{ messageid: 85463238 }] }),
      );
    };
    const adapter = new KavenegarSmsAdapter(
      'sandbox-api-key',
      'KeleOtp',
      1_000,
      fetcher,
      'https://kavenegar.invalid',
    );
    await expect(
      adapter.sendOtp({ mobile: '+989121234567', code: '123456', correlationId: 'opaque-id' }),
    ).resolves.toEqual({
      provider: 'kavenegar',
      providerMessageId: '85463238',
      accepted: true,
    });
    expect(requestedUrl).toContain('/verify/lookup.json?');
    expect(requestedUrl).toContain('template=KeleOtp');
  });

  it('[OQ-003-PROD] maps Kavenegar delivery status to a bounded provider-neutral outcome', async () => {
    const fetcher: typeof fetch = () =>
      Promise.resolve(
        Response.json({
          return: { status: 200 },
          entries: [{ messageid: 85463238, status: 10, statustext: 'delivered' }],
        }),
      );
    const adapter = new KavenegarSmsAdapter(
      'sandbox-api-key',
      'KeleOtp',
      1_000,
      fetcher,
      'https://kavenegar.invalid',
    );
    await expect(adapter.getDeliveryStatus('85463238')).resolves.toEqual({
      provider: 'kavenegar',
      providerMessageId: '85463238',
      status: 'delivered',
    });
    await expect(adapter.getDeliveryStatus('not-a-message-id')).rejects.toThrow('invalid');
  });

  it('[OQ-002-PROD] maps Vandar intent and server-verified success contracts', async () => {
    const responses = [
      { status: 1, token: sandboxPaymentToken },
      { status: 1, amount: '12000000', transId: 159178352177, code: 1 },
      { status: 1, amount: '12000000', transId: 159178352177 },
    ];
    const fetcher: typeof fetch = () => Promise.resolve(Response.json(responses.shift()));
    const adapter = new VandarPaymentAdapter(
      'sandbox-api-key',
      'https://api.kele.invalid/api/v1',
      1_000,
      fetcher,
      'https://vandar.invalid',
    );
    await expect(
      adapter.createIntent({
        applicationReference: 'application-reference',
        paymentAttemptId: '00000000-0000-4000-8000-000000000001',
        amountRial: 12_000_000,
        currency: 'IRR',
        returnBaseUrl: 'https://kele.invalid',
        correlationId: 'opaque-id',
      }),
    ).resolves.toEqual({
      provider: 'vandar',
      reference: sandboxPaymentToken,
      redirectUrl: `https://vandar.invalid/v3/${sandboxPaymentToken}`,
      status: 'created',
    });
    await expect(
      adapter.verifyCallback({
        authenticator: sandboxPaymentToken,
        payload: { token: sandboxPaymentToken, paymentStatus: 'OK' },
        now: new Date('2026-08-07T12:00:00.000Z'),
      }),
    ).resolves.toMatchObject({
      provider: 'vandar',
      providerReference: sandboxPaymentToken,
      providerTransactionId: '159178352177',
      amountRial: 12_000_000,
      currency: 'IRR',
      status: 'success',
      nonce: sandboxPaymentToken,
    });
  });

  it('[OQ-002-PROD] rejects altered Vandar callbacks before provider mutation', async () => {
    const adapter = new VandarPaymentAdapter(
      'sandbox-api-key',
      'https://api.kele.invalid/api/v1',
      1_000,
      fetch,
      'https://vandar.invalid',
    );
    await expect(
      adapter.verifyCallback({
        authenticator: sandboxPaymentToken,
        payload: { token: alteredPaymentToken, paymentStatus: 'OK' },
        now: new Date('2026-08-07T12:00:00.000Z'),
      }),
    ).rejects.toMatchObject({ code: 'PAYMENT_CALLBACK_UNVERIFIED' });
  });

  it('[OQ-002-PROD] maps Vandar refund acceptance as pending until provider completion', async () => {
    const fetcher: typeof fetch = () =>
      Promise.resolve(
        Response.json({
          status: 1,
          data: { results: [{ id: 'refund-sandbox-1', status: 'PENDING' }] },
        }),
      );
    const adapter = new VandarRefundAdapter(
      'sandbox-access-token',
      'kele',
      1_000,
      fetcher,
      'https://vandar.invalid',
    );
    await expect(
      adapter.requestRefund({
        providerTransactionId: '159178352177',
        amountRial: 2_000_000,
        currency: 'IRR',
        idempotencyKey: 'refund-idempotency-0001',
        correlationId: 'opaque-id',
        requestedAt: new Date('2026-08-07T12:00:00.000Z'),
      }),
    ).resolves.toEqual({
      provider: 'vandar',
      providerReference: 'refund-sandbox-1',
      status: 'pending',
      confirmedAt: null,
      failureCode: null,
    });
  });

  it('[CERT-M9-001] never treats the unauthenticated refund response as completion', async () => {
    const fetcher: typeof fetch = () =>
      Promise.resolve(
        Response.json({
          status: 1,
          data: { results: [{ id: 'refund-sandbox-2', status: 'DONE' }] },
        }),
      );
    const adapter = new VandarRefundAdapter(
      'sandbox-access-token',
      'kele',
      1_000,
      fetcher,
      'https://vandar.invalid',
    );
    await expect(
      adapter.requestRefund({
        providerTransactionId: '159178352178',
        amountRial: 2_000_000,
        currency: 'IRR',
        idempotencyKey: 'refund-idempotency-0002',
        correlationId: 'opaque-id',
        requestedAt: new Date('2026-08-07T12:00:00.000Z'),
      }),
    ).resolves.toMatchObject({
      providerReference: 'refund-sandbox-2',
      status: 'pending',
      confirmedAt: null,
    });
  });

  it('[OQ-018] creates bounded Arvan-compatible signed URLs and isolates quarantine objects', async () => {
    const adapter = new ArvanObjectStorageAdapter(
      'kele-m9-media',
      'https://s3.ir-thr-at1.arvanstorage.ir',
      'ir-thr-at1',
      'sandbox-access-key',
      'sandbox-secret-key',
      'https://media.kele.invalid',
    );
    const upload = await adapter.createSignedUpload({
      key: 'quarantine/00000000-0000-4000-8000-000000000001.webp',
      contentType: 'image/webp',
      expiresInSeconds: 300,
    });
    expect(upload).toContain('X-Amz-Expires=300');
    expect(upload).toContain('X-Amz-Signature=');
    expect(() => adapter.publicUrl('quarantine/file.webp')).toThrow('no public URL');
    expect(adapter.publicUrl('media/products/file.webp')).toBe(
      'https://media.kele.invalid/media/products/file.webp',
    );
    expect(() => adapter.createSignedRead('media/products/file.webp', 901)).toThrow(
      'between 30 and 900',
    );
  });

  it('uses path-style addressing for a public MinIO demo endpoint', async () => {
    const adapter = new S3ObjectStorageAdapter(
      'minio',
      'kele-render-demo',
      'https://storage.onrender.com',
      'us-east-1',
      'demo-access-key',
      'demo-secret-key',
      'https://storage.onrender.com/kele-render-demo',
    );
    const upload = await adapter.createSignedUpload({
      key: 'quarantine/00000000-0000-4000-8000-000000000001.webp',
      contentType: 'image/webp',
      expiresInSeconds: 300,
    });
    expect(new URL(upload).hostname).toBe('storage.onrender.com');
    expect(new URL(upload).pathname).toBe(
      '/kele-render-demo/quarantine/00000000-0000-4000-8000-000000000001.webp',
    );
  });
});
