import { describe, expect, it } from 'vitest';
import { parseEnvironment } from './index.js';

const valid = {
  NODE_ENV: 'test',
  PORT: '3001',
  DATABASE_URL: 'postgresql://kele:kele@localhost:5432/kele?schema=public',
  STORAGE_ENDPOINT: 'http://localhost:9000',
  STORAGE_REGION: 'us-east-1',
  STORAGE_BUCKET: 'kele-development',
  STORAGE_ACCESS_KEY: 'development-access',
  STORAGE_SECRET_KEY: 'development-secret',
  PAYMENT_PROVIDER: 'fake',
  SMS_PROVIDER: 'fake',
  API_BASE_URL: 'http://localhost:3001/api/v1',
  NEXT_PUBLIC_API_BASE_URL: 'http://localhost:3001/api/v1',
};

describe('environment configuration', () => {
  it('[PAY-001][SMS-001] rejects fake providers in production', () => {
    expect(() => parseEnvironment({ ...valid, NODE_ENV: 'production' })).toThrow(
      'The fake payment provider is forbidden in production.',
    );
  });

  it('rejects malformed required configuration', () => {
    expect(() => parseEnvironment({ ...valid, DATABASE_URL: 'not-a-url' })).toThrow();
  });
});
