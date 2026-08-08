import { Module } from '@nestjs/common';
import { FakePaymentAdapter } from './infrastructure/fake-payment.adapter.js';
import { FakeSmsAdapter } from './infrastructure/fake-sms.adapter.js';
import {
  FAKE_PAYMENT_SIMULATOR,
  PAYMENT_GATEWAY,
  SMS_GATEWAY,
  REFUND_GATEWAY,
  OBJECT_STORAGE,
} from './application/provider.tokens.js';
import { environment } from '../../platform/config/environment.js';
import { runtimeIdFactory } from '../../shared/deterministic-runtime.js';
import { FakeRefundAdapter } from './infrastructure/fake-refund.adapter.js';
import { VandarPaymentAdapter } from './infrastructure/vandar-payment.adapter.js';
import { VandarRefundAdapter } from './infrastructure/vandar-refund.adapter.js';
import { KavenegarSmsAdapter } from './infrastructure/kavenegar-sms.adapter.js';
import type { PaymentGateway } from './application/payment-gateway.port.js';
import type { RefundGateway } from './application/refund-gateway.port.js';
import type { SmsGateway } from './application/sms-gateway.port.js';
import type { ObjectStorage } from './application/object-storage.port.js';
import {
  ArvanObjectStorageAdapter,
  S3ObjectStorageAdapter,
} from './infrastructure/arvan-object-storage.adapter.js';

function requiredProviderValue(value: string | undefined, name: string): string {
  if (value === undefined)
    throw new Error(`${name} is required by validated provider configuration.`);
  return value;
}

@Module({
  providers: [
    {
      provide: FakePaymentAdapter,
      useFactory: (): FakePaymentAdapter =>
        new FakePaymentAdapter(
          environment.FAKE_PAYMENT_SIGNING_SECRET,
          runtimeIdFactory(environment.E2E_DETERMINISTIC_ID_SEED, 'fake-payment-callback'),
        ),
    },
    FakeSmsAdapter,
    FakeRefundAdapter,
    { provide: FAKE_PAYMENT_SIMULATOR, useExisting: FakePaymentAdapter },
    {
      provide: PAYMENT_GATEWAY,
      useFactory: (fake: FakePaymentAdapter): PaymentGateway =>
        environment.PAYMENT_PROVIDER === 'vandar'
          ? new VandarPaymentAdapter(
              requiredProviderValue(environment.VANDAR_IPG_API_KEY, 'VANDAR_IPG_API_KEY'),
              requiredProviderValue(
                environment.PAYMENT_CALLBACK_BASE_URL,
                'PAYMENT_CALLBACK_BASE_URL',
              ),
              environment.PROVIDER_REQUEST_TIMEOUT_MS,
              fetch,
              environment.VANDAR_IPG_BASE_URL,
            )
          : fake,
      inject: [FakePaymentAdapter],
    },
    {
      provide: SMS_GATEWAY,
      useFactory: (fake: FakeSmsAdapter): SmsGateway =>
        environment.SMS_PROVIDER === 'kavenegar'
          ? new KavenegarSmsAdapter(
              requiredProviderValue(environment.KAVENEGAR_API_KEY, 'KAVENEGAR_API_KEY'),
              environment.KAVENEGAR_OTP_TEMPLATE,
              Math.min(environment.PROVIDER_REQUEST_TIMEOUT_MS, 8_000),
            )
          : fake,
      inject: [FakeSmsAdapter],
    },
    {
      provide: REFUND_GATEWAY,
      useFactory: (fake: FakeRefundAdapter): RefundGateway =>
        environment.REFUND_PROVIDER === 'vandar'
          ? new VandarRefundAdapter(
              requiredProviderValue(
                environment.VANDAR_REFUND_ACCESS_TOKEN,
                'VANDAR_REFUND_ACCESS_TOKEN',
              ),
              requiredProviderValue(environment.VANDAR_BUSINESS_NAME, 'VANDAR_BUSINESS_NAME'),
              environment.PROVIDER_REQUEST_TIMEOUT_MS,
              fetch,
              environment.VANDAR_API_BASE_URL,
            )
          : fake,
      inject: [FakeRefundAdapter],
    },
    {
      provide: OBJECT_STORAGE,
      useFactory: (): ObjectStorage => {
        const publicBaseUrl =
          environment.STORAGE_PUBLIC_BASE_URL ??
          `${environment.STORAGE_ENDPOINT.replace(/\/$/, '')}/${environment.STORAGE_BUCKET}`;
        if (environment.STORAGE_PROVIDER === 'arvan_s3') {
          return new ArvanObjectStorageAdapter(
            environment.STORAGE_BUCKET,
            environment.STORAGE_ENDPOINT,
            environment.STORAGE_REGION,
            environment.STORAGE_ACCESS_KEY,
            environment.STORAGE_SECRET_KEY,
            publicBaseUrl,
          );
        }
        return new S3ObjectStorageAdapter(
          'minio',
          environment.STORAGE_BUCKET,
          environment.STORAGE_ENDPOINT,
          environment.STORAGE_REGION,
          environment.STORAGE_ACCESS_KEY,
          environment.STORAGE_SECRET_KEY,
          publicBaseUrl,
        );
      },
    },
  ],
  exports: [PAYMENT_GATEWAY, FAKE_PAYMENT_SIMULATOR, SMS_GATEWAY, REFUND_GATEWAY, OBJECT_STORAGE],
})
export class FoundationModule {}
