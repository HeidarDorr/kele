import { describe, expect, it } from 'vitest';
import { parseEnvironment } from './index.js';

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
    expect(() => parseEnvironment({ ...valid, NODE_ENV: 'production' })).toThrow(
      'The fake payment provider is forbidden in production.',
    );
  });

  it('rejects development administrator sessions in production', () => {
    expect(() =>
      parseEnvironment({
        ...valid,
        NODE_ENV: 'production',
        PAYMENT_PROVIDER: 'real',
        SMS_PROVIDER: 'real',
        ADMIN_SUPER_SESSION_TOKEN: unsafeProductionSession,
      }),
    ).toThrow();
  });

  it('rejects malformed required configuration', () => {
    expect(() => parseEnvironment({ ...valid, DATABASE_URL: 'not-a-url' })).toThrow();
    expect(() => parseEnvironment({ ...valid, FAKE_SMS_OTP_CODE: '12345' })).toThrow();
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
