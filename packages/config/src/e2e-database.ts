export const E2E_DATABASE_NAME = 'kele_e2e';

export interface E2EDatabaseConfiguration {
  readonly databaseName: typeof E2E_DATABASE_NAME;
  readonly databaseUrl: string;
  readonly maintenanceUrl: string;
}

function parsePostgresUrl(variable: string, candidate: string | undefined): URL {
  if (candidate === undefined || candidate.length === 0) {
    throw new Error(`${variable} is required for the isolated E2E database.`);
  }

  let parsed: URL;
  try {
    parsed = new URL(candidate);
  } catch {
    throw new Error(`${variable} must be a valid PostgreSQL URL.`);
  }
  if (parsed.protocol !== 'postgresql:' && parsed.protocol !== 'postgres:') {
    throw new Error(`${variable} must use the postgresql protocol.`);
  }
  return parsed;
}

function readDatabaseName(variable: string, parsed: URL): string {
  const name = decodeURIComponent(parsed.pathname.replace(/^\//, ''));
  if (name.length === 0 || name.includes('/')) {
    throw new Error(`${variable} must identify one PostgreSQL database.`);
  }
  return name;
}

function databaseIdentity(parsed: URL): string {
  const port = parsed.port || '5432';
  return `${parsed.protocol}//${parsed.username}@${parsed.hostname}:${port}/${readDatabaseName('database URL', parsed)}`;
}

function toE2EConfiguration(e2e: URL): E2EDatabaseConfiguration {
  const maintenance = new URL(e2e);
  maintenance.pathname = '/postgres';
  maintenance.searchParams.delete('schema');

  return {
    databaseName: E2E_DATABASE_NAME,
    databaseUrl: e2e.toString(),
    maintenanceUrl: maintenance.toString(),
  };
}

export function readE2EDatabaseConfiguration(
  environment: NodeJS.ProcessEnv,
): E2EDatabaseConfiguration {
  const development = parsePostgresUrl('DATABASE_URL', environment.DATABASE_URL);
  const e2e = parsePostgresUrl('E2E_DATABASE_URL', environment.E2E_DATABASE_URL);
  const e2eDatabaseName = readDatabaseName('E2E_DATABASE_URL', e2e);

  if (e2eDatabaseName !== E2E_DATABASE_NAME) {
    throw new Error(`E2E_DATABASE_URL must target the database named ${E2E_DATABASE_NAME}.`);
  }
  if (databaseIdentity(development) === databaseIdentity(e2e)) {
    throw new Error('E2E_DATABASE_URL must not target the normal DATABASE_URL database.');
  }

  return toE2EConfiguration(e2e);
}

export function assertE2EDatabaseResetEnvironment(
  environment: NodeJS.ProcessEnv,
): E2EDatabaseConfiguration {
  if (environment.NODE_ENV !== 'test') {
    throw new Error('E2E_DATABASE_RESET is allowed only when NODE_ENV=test.');
  }
  const e2e = parsePostgresUrl('E2E_DATABASE_URL', environment.E2E_DATABASE_URL);
  const active = parsePostgresUrl('DATABASE_URL', environment.DATABASE_URL);
  if (readDatabaseName('E2E_DATABASE_URL', e2e) !== E2E_DATABASE_NAME) {
    throw new Error(`E2E_DATABASE_URL must target the database named ${E2E_DATABASE_NAME}.`);
  }
  if (readDatabaseName('DATABASE_URL', active) !== E2E_DATABASE_NAME) {
    throw new Error(`DATABASE_URL must target the database named ${E2E_DATABASE_NAME} for reset.`);
  }
  if (environment.DATABASE_URL !== environment.E2E_DATABASE_URL) {
    throw new Error('E2E reset requires DATABASE_URL to exactly equal E2E_DATABASE_URL.');
  }
  return toE2EConfiguration(e2e);
}
