import { describe, expect, it } from 'vitest';
import { validateUatSeedEnvironment } from '../src/infrastructure/prisma/uat-seed.js';
import {
  createLiaraUatGateway,
  parseLiaraUatRuntimeEnvironment,
  upstreamForPath,
} from '../src/platform/liara-uat-runtime.js';

const credentialFixture = ['uat', 'fixture', 'value', 'longer', 'than', 'thirty-two'].join('-');
const valid: NodeJS.ProcessEnv = {
  NODE_ENV: 'production',
  KELE_DEPLOYMENT_TIER: 'uat',
  KELE_UAT_BOOTSTRAP: 'synthetic-only',
  KELE_UAT_ADMIN_MOBILE: '+989000000001',
  KELE_PUBLIC_ORIGIN: 'https://kele-demo.liara.run',
  DATABASE_URL: 'postgresql://kele:secret@db.internal:5432/kele',
  PAYMENT_PROVIDER: 'fake',
  REFUND_PROVIDER: 'fake',
  SMS_PROVIDER: 'fake',
  STORAGE_PROVIDER: 'minio',
  ERROR_MONITORING_PROVIDER: 'structured_log',
  ADMIN_SESSION_PROVIDER: 'postgres_otp',
  FAKE_PAYMENT_SIGNING_SECRET: credentialFixture,
  METRICS_BEARER_TOKEN: credentialFixture,
  IDENTITY_SIGNING_SECRET: credentialFixture,
  OTP_VERIFIER_PEPPER: credentialFixture,
  ADMIN_SESSION_SIGNING_SECRET: credentialFixture,
  ADMIN_OTP_VERIFIER_PEPPER: credentialFixture,
};

describe('Liara synthetic UAT runtime', () => {
  it('routes one public HTTP port to the three application processes', () => {
    expect(upstreamForPath('/')).toBe('storefront');
    expect(upstreamForPath('/api/commerce/cart')).toBe('storefront');
    expect(upstreamForPath('/api/v1/health/ready')).toBe('api');
    expect(upstreamForPath('/admin')).toBe('admin');
    expect(upstreamForPath('/admin/_next/static/app.js')).toBe('admin');
  });

  it('bounds public gateway connections for the shared UAT process', () => {
    const gateway = createLiaraUatGateway(parseLiaraUatRuntimeEnvironment(valid));
    expect(gateway.requestTimeout).toBe(30_000);
    expect(gateway.headersTimeout).toBe(15_000);
    expect(gateway.keepAliveTimeout).toBe(5_000);
    expect(gateway.maxHeadersCount).toBe(100);
  });

  it('accepts only the explicit HTTPS synthetic-UAT boundary', () => {
    expect(parseLiaraUatRuntimeEnvironment(valid)).toMatchObject({
      publicOrigin: 'https://kele-demo.liara.run',
      publicPort: 3000,
      apiPort: 3101,
      storefrontPort: 3100,
      adminPort: 3102,
    });
    expect(validateUatSeedEnvironment(valid)).toBe('+989000000001');
  });

  it('fails closed on a real provider, public HTTP or colliding process ports', () => {
    expect(() => parseLiaraUatRuntimeEnvironment({ ...valid, PAYMENT_PROVIDER: 'vandar' })).toThrow(
      'PAYMENT_PROVIDER=fake',
    );
    expect(() =>
      parseLiaraUatRuntimeEnvironment({
        ...valid,
        KELE_PUBLIC_ORIGIN: 'http://kele-demo.liara.run',
      }),
    ).toThrow('KELE_PUBLIC_ORIGIN');
    expect(() =>
      parseLiaraUatRuntimeEnvironment({ ...valid, KELE_INTERNAL_API_PORT: '3000' }),
    ).toThrow('ports must be distinct');
  });
});
