import { describe, expect, it } from 'vitest';
import { assertE2EDatabaseResetEnvironment, readE2EDatabaseConfiguration } from './e2e-database.js';

const developmentUrl = 'postgresql://kele:kele@localhost:5432/kele?schema=public';
const e2eUrl = 'postgresql://kele:kele@localhost:5432/kele_e2e?schema=public';

describe('isolated E2E database configuration', () => {
  it('accepts a distinct database named exactly kele_e2e', () => {
    expect(
      readE2EDatabaseConfiguration({
        DATABASE_URL: developmentUrl,
        E2E_DATABASE_URL: e2eUrl,
      }),
    ).toEqual({
      databaseName: 'kele_e2e',
      databaseUrl: e2eUrl,
      maintenanceUrl: 'postgresql://kele:kele@localhost:5432/postgres',
    });
  });

  it.each([
    [{ DATABASE_URL: developmentUrl }, 'E2E_DATABASE_URL is required'],
    [
      { DATABASE_URL: developmentUrl, E2E_DATABASE_URL: 'not-a-url' },
      'E2E_DATABASE_URL must be a valid PostgreSQL URL',
    ],
    [
      {
        DATABASE_URL: developmentUrl,
        E2E_DATABASE_URL: 'postgresql://kele:kele@localhost:5432/kele?schema=public',
      },
      'E2E_DATABASE_URL must target the database named kele_e2e',
    ],
  ])('rejects unsafe E2E configuration %#', (environment, message) => {
    expect(() => readE2EDatabaseConfiguration(environment)).toThrow(message);
  });

  it('rejects the same E2E database identity as DATABASE_URL', () => {
    expect(() =>
      readE2EDatabaseConfiguration({
        DATABASE_URL: e2eUrl,
        E2E_DATABASE_URL: e2eUrl,
      }),
    ).toThrow('E2E_DATABASE_URL must not target the normal DATABASE_URL database.');
  });

  it('requires the active seed URL to exactly equal the guarded E2E URL', () => {
    expect(() =>
      assertE2EDatabaseResetEnvironment({
        NODE_ENV: 'test',
        DATABASE_URL: developmentUrl,
        E2E_DATABASE_URL: e2eUrl,
      }),
    ).toThrow('DATABASE_URL must target the database named kele_e2e for reset.');
  });

  it('accepts reset only when the active and E2E URLs are exactly the guarded database', () => {
    expect(
      assertE2EDatabaseResetEnvironment({
        NODE_ENV: 'test',
        DATABASE_URL: e2eUrl,
        E2E_DATABASE_URL: e2eUrl,
      }).databaseName,
    ).toBe('kele_e2e');
  });

  it('rejects a differently serialized active URL even when the database name is safe', () => {
    expect(() =>
      assertE2EDatabaseResetEnvironment({
        NODE_ENV: 'test',
        DATABASE_URL: `${e2eUrl}&connect_timeout=5`,
        E2E_DATABASE_URL: e2eUrl,
      }),
    ).toThrow('E2E reset requires DATABASE_URL to exactly equal E2E_DATABASE_URL.');
  });

  it('rejects reset outside NODE_ENV=test', () => {
    expect(() =>
      assertE2EDatabaseResetEnvironment({
        NODE_ENV: 'development',
        DATABASE_URL: e2eUrl,
        E2E_DATABASE_URL: e2eUrl,
      }),
    ).toThrow('E2E_DATABASE_RESET is allowed only when NODE_ENV=test.');
  });
});
