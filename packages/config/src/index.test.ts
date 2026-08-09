import { describe, expect, it } from 'vitest';
import { environmentSchema, parseEnvironment } from './index.js';

function fixtureCredential(name: string): string {
  return `${name}-fixture-credential-value`;
}

const storageAccessCredential = 'development-access';
const storagePrivateCredential = 'development-secret';
const superSession = 'test-super-admin-session-token-00000000001';
const inventorySession = 'test-inventory-admin-session-token-0000001';
const instagramSession = 'test-instagram-admin-session-token-0000001';
const unsafeProductionSession = 'development-super-admin-session-token-00000001';

const valid = {
  NODE_ENV: 'test',
  PORT: '3001',
  DATABASE_URL: 'postgresql://kele:kele@localhost:5432/kele?schema=public',
  STORAGE_ENDPOINT: 'http://localhost:9000',
  STORAGE_REGION: 'us-east-1',
  STORAGE_BUCKET: 'kele-development',
  STORAGE_ACCESS_KEY: storageAccessCredential,
  STORAGE_SECRET_KEY: storagePrivateCredential,
  PAYMENT_PROVIDER: 'fake',
  SMS_PROVIDER: 'fake',
  FAKE_SMS_OTP_CODE: '111111',
  API_BASE_URL: 'http://localhost:3001/api/v1',
  NEXT_PUBLIC_API_BASE_URL: 'http://localhost:3001/api/v1',
  ADMIN_SUPER_SESSION_TOKEN: superSession,
  ADMIN_INVENTORY_SESSION_TOKEN: inventorySession,
  ADMIN_INSTAGRAM_SESSION_TOKEN: instagramSession,
};

describe('environment configuration', () => {
  it('defaults typography to Elize and accepts the Markazi review variant', () => {
    expect(parseEnvironment(valid).KELE_TYPOGRAPHY).toBe('elize');
    expect(parseEnvironment({ ...valid, KELE_TYPOGRAPHY: 'markazi' }).KELE_TYPOGRAPHY).toBe(
      'markazi',
    );
    expect(() => parseEnvironment({ ...valid, KELE_TYPOGRAPHY: 'other' })).toThrow();
  });

  it('[PAY-001][SMS-001] rejects fake providers in production', () => {
    const parsed = environmentSchema.safeParse({ ...valid, NODE_ENV: 'production' });
    expect(parsed.success).toBe(false);
    if (parsed.success) throw new Error('Production Fake providers must fail closed.');
    expect(parsed.error.issues.map((issue) => issue.path[0])).toEqual(
      expect.arrayContaining([
        'PAYMENT_PROVIDER',
        'REFUND_PROVIDER',
        'SMS_PROVIDER',
        'STORAGE_PROVIDER',
        'ERROR_MONITORING_PROVIDER',
        'ADMIN_SESSION_PROVIDER',
      ]),
    );
  });

  it('permits synthetic providers only in the explicit UAT tier', () => {
    const uat = parseEnvironment({
      ...valid,
      NODE_ENV: 'production',
      KELE_DEPLOYMENT_TIER: 'uat',
      ADMIN_SESSION_PROVIDER: 'postgres_otp',
      ADMIN_SESSION_SIGNING_SECRET: fixtureCredential('uat-admin-session'),
      ADMIN_OTP_VERIFIER_PEPPER: fixtureCredential('uat-admin-otp'),
    });
    expect(uat).toMatchObject({
      KELE_DEPLOYMENT_TIER: 'uat',
      PAYMENT_PROVIDER: 'fake',
      SMS_PROVIDER: 'fake',
    });
    expect(() =>
      parseEnvironment({ ...valid, NODE_ENV: 'production', KELE_DEPLOYMENT_TIER: 'staging' }),
    ).toThrow('The fake payment provider is forbidden in production.');
    expect(() =>
      parseEnvironment({ ...valid, NODE_ENV: 'test', KELE_DEPLOYMENT_TIER: 'uat' }),
    ).toThrow('An explicit deployment tier requires NODE_ENV=production.');
  });

  it('[OQ-002-PROD][OQ-003-PROD][OQ-017][OQ-018][OQ-022] accepts only the approved production package', () => {
    const production = parseEnvironment({
      ...valid,
      NODE_ENV: 'production',
      DATABASE_URL: 'postgresql://kele:secret@db.internal:5432/kele?sslmode=require',
      STORAGE_ENDPOINT: 'https://s3.ir-thr-at1.arvanstorage.ir',
      STORAGE_REGION: 'ir-thr-at1',
      STORAGE_BUCKET: 'kele-production-media',
      STORAGE_PROVIDER: 'arvan_s3',
      STORAGE_PUBLIC_BASE_URL: 'https://media.kele.example',
      ARVAN_CDN_API_TOKEN: fixtureCredential('arvan-cdn'),
      PAYMENT_PROVIDER: 'vandar',
      REFUND_PROVIDER: 'vandar',
      VANDAR_IPG_API_KEY: fixtureCredential('vandar-ipg'),
      VANDAR_REFUND_ACCESS_TOKEN: fixtureCredential('vandar-refund-access'),
      VANDAR_REFUND_REFRESH_TOKEN: fixtureCredential('vandar-refund-refresh'),
      VANDAR_BUSINESS_NAME: 'kele',
      PAYMENT_CALLBACK_BASE_URL: 'https://api.kele.example/api/v1',
      SMS_PROVIDER: 'kavenegar',
      KAVENEGAR_API_KEY: fixtureCredential('kavenegar'),
      API_BASE_URL: 'https://api.kele.example/api/v1',
      NEXT_PUBLIC_API_BASE_URL: 'https://api.kele.example/api/v1',
      STOREFRONT_ORIGIN: 'https://kele.example',
      ADMIN_ORIGIN: 'https://admin.kele.example',
      ERROR_MONITORING_PROVIDER: 'self_hosted_grafana',
      LOKI_PUSH_URL: 'https://loki.internal/loki/api/v1/push',
      LOKI_TENANT_ID: 'kele-production',
      LOKI_PUSH_TOKEN: fixtureCredential('loki-push'),
      METRICS_BEARER_TOKEN: fixtureCredential('metrics-bearer'),
      IDENTITY_SIGNING_SECRET: fixtureCredential('identity-signing'),
      OTP_VERIFIER_PEPPER: fixtureCredential('otp-verifier'),
      ADMIN_SESSION_PROVIDER: 'postgres_otp',
      ADMIN_SESSION_SIGNING_SECRET: fixtureCredential('admin-session-signing'),
      ADMIN_OTP_VERIFIER_PEPPER: fixtureCredential('admin-otp-verifier'),
    });
    expect(production).toMatchObject({
      PAYMENT_PROVIDER: 'vandar',
      REFUND_PROVIDER: 'vandar',
      SMS_PROVIDER: 'kavenegar',
      STORAGE_PROVIDER: 'arvan_s3',
      ERROR_MONITORING_PROVIDER: 'self_hosted_grafana',
      ADMIN_SESSION_PROVIDER: 'postgres_otp',
    });
  });

  it('rejects development administrator sessions in production', () => {
    const parsed = environmentSchema.safeParse({
      ...valid,
      NODE_ENV: 'production',
      ADMIN_SUPER_SESSION_TOKEN: unsafeProductionSession,
    });
    expect(parsed.success).toBe(false);
    if (parsed.success) throw new Error('Development administrator sessions must fail closed.');
    expect(parsed.error.issues.map((issue) => issue.path[0])).toContain(
      'ADMIN_SUPER_SESSION_TOKEN',
    );
  });

  it('rejects malformed required configuration', () => {
    expect(() => parseEnvironment({ ...valid, DATABASE_URL: 'not-a-url' })).toThrow();
    expect(() => parseEnvironment({ ...valid, FAKE_SMS_OTP_CODE: '12345' })).toThrow();
  });

  it('validates bounded operational hardening controls', () => {
    expect(parseEnvironment(valid)).toMatchObject({
      ADMIN_ORIGIN: 'http://localhost:3002',
      ADMIN_SESSION_PROVIDER: 'development_static',
      API_JSON_BODY_LIMIT_BYTES: 131_072,
      CALLBACK_RATE_LIMIT_PER_MINUTE: 120,
      ERROR_MONITORING_PROVIDER: 'structured_log',
      READINESS_TIMEOUT_MS: 1_000,
      REFUND_PROVIDER: 'fake',
      STORAGE_PROVIDER: 'minio',
    });
    expect(() => parseEnvironment({ ...valid, API_JSON_BODY_LIMIT_BYTES: '1000' })).toThrow();
    expect(() =>
      parseEnvironment({ ...valid, HEADERS_TIMEOUT_MS: '20000', REQUEST_TIMEOUT_MS: '10000' }),
    ).toThrow('HEADERS_TIMEOUT_MS must be lower than REQUEST_TIMEOUT_MS.');
  });

  it('uses an explicit six-digit fake OTP code', () => {
    expect(parseEnvironment(valid).FAKE_SMS_OTP_CODE).toBe('111111');
    expect(parseEnvironment({ ...valid, FAKE_SMS_OTP_CODE: '654321' }).FAKE_SMS_OTP_CODE).toBe(
      '654321',
    );
  });

  it('accepts deterministic runtime controls only in the test environment', () => {
    const deterministic = {
      ...valid,
      E2E_FIXED_TIME: '2026-08-02T09:00:00.000Z',
      E2E_DETERMINISTIC_ID_SEED: 'kele-evidence-runtime-seed-v1',
    };
    expect(parseEnvironment(deterministic)).toMatchObject({
      E2E_FIXED_TIME: '2026-08-02T09:00:00.000Z',
      E2E_DETERMINISTIC_ID_SEED: 'kele-evidence-runtime-seed-v1',
    });
    expect(() => parseEnvironment({ ...deterministic, NODE_ENV: 'development' })).toThrow(
      'Deterministic E2E runtime controls are allowed only when NODE_ENV=test.',
    );
  });
});
