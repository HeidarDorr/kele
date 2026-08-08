import { randomBytes } from 'node:crypto';
import { chmod, mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const outputArgument = process.argv.indexOf('--output');
const outputRelative = outputArgument === -1 ? '.env.codespaces' : process.argv[outputArgument + 1];
if (outputRelative === undefined || outputRelative.startsWith('-')) {
  throw new Error('--output requires a repository-relative file path.');
}

const output = path.resolve(root, outputRelative);
if (output !== root && !output.startsWith(`${root}${path.sep}`)) {
  throw new Error('The Codespaces environment file must stay inside the repository workspace.');
}
if (process.env.CODESPACES !== 'true' && process.env.KELE_CODESPACES_CONFIG_TEST !== 'true') {
  throw new Error('Codespaces demo configuration is allowed only inside GitHub Codespaces.');
}

const codespaceName = process.env.CODESPACE_NAME;
if (codespaceName === undefined || !/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(codespaceName)) {
  throw new Error('CODESPACE_NAME is missing or invalid.');
}
const forwardingDomain = process.env.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN ?? 'app.github.dev';
if (!/^[a-z0-9.-]+$/i.test(forwardingDomain)) {
  throw new Error('GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN is invalid.');
}

function parseEnvironmentFile(value) {
  return Object.fromEntries(
    value
      .split(/\r?\n/)
      .filter((line) => line.length > 0 && !line.startsWith('#'))
      .map((line) => {
        const separator = line.indexOf('=');
        return separator < 1 ? [line, ''] : [line.slice(0, separator), line.slice(separator + 1)];
      }),
  );
}

function publicOrigin(port) {
  return `https://${codespaceName}-${String(port)}.${forwardingDomain}`;
}

function printUrls() {
  process.stdout.write(`Storefront: ${publicOrigin(3000)}\n`);
  process.stdout.write(`Administration: ${publicOrigin(3002)}\n`);
  process.stdout.write(`API health: ${publicOrigin(3001)}/api/v1/health/ready\n`);
}

const existing = await readFile(output, 'utf8').catch(() => null);
if (existing !== null) {
  const parsed = parseEnvironmentFile(existing);
  if (parsed.KELE_DEMO_PROFILE !== 'codespaces') {
    throw new Error(`${outputRelative} exists but is not a guarded KELE Codespaces demo file.`);
  }
  if (parsed.KELE_CODESPACE_NAME !== codespaceName) {
    throw new Error(
      `${outputRelative} belongs to a different Codespace and will not be overwritten.`,
    );
  }
  await chmod(output, 0o600).catch(() => undefined);
  process.stdout.write(`Reusing guarded configuration ${outputRelative}.\n`);
  printUrls();
  process.exit(0);
}

const randomCredential = () => randomBytes(24).toString('base64url');
const databaseUser = 'kele_demo';
const databasePassword = randomCredential();
const databaseName = 'kele_e2e';
const databaseUrl = `postgresql://${databaseUser}:${databasePassword}@127.0.0.1:5432/${databaseName}?schema=public`;
const storageAccess = `demo${randomBytes(12).toString('base64url')}`;
const storagePrivate = randomCredential();

const values = [
  ['KELE_DEMO_PROFILE', 'codespaces'],
  ['KELE_CODESPACE_NAME', codespaceName],
  ['NODE_ENV', 'development'],
  ['PORT', '3001'],
  ['KELE_DEMO_POSTGRES_USER', databaseUser],
  ['KELE_DEMO_POSTGRES_PASSWORD', databasePassword],
  ['KELE_DEMO_POSTGRES_DATABASE', databaseName],
  ['DATABASE_URL', databaseUrl],
  ['E2E_DATABASE_URL', databaseUrl],
  ['STORAGE_ENDPOINT', 'http://127.0.0.1:9000'],
  ['STORAGE_REGION', 'us-east-1'],
  ['STORAGE_BUCKET', 'kele-codespaces'],
  ['STORAGE_PROVIDER', 'minio'],
  ['STORAGE_ACCESS_KEY', storageAccess],
  ['STORAGE_SECRET_KEY', storagePrivate],
  ['KELE_DEMO_MINIO_ROOT_USER', storageAccess],
  ['KELE_DEMO_MINIO_ROOT_PASSWORD', storagePrivate],
  ['PAYMENT_PROVIDER', 'fake'],
  ['REFUND_PROVIDER', 'fake'],
  ['FAKE_PAYMENT_SIGNING_SECRET', randomCredential()],
  ['SMS_PROVIDER', 'fake'],
  ['FAKE_SMS_OTP_CODE', '111111'],
  ['API_BASE_URL', 'http://127.0.0.1:3001/api/v1'],
  ['NEXT_PUBLIC_API_BASE_URL', `${publicOrigin(3001)}/api/v1`],
  ['STOREFRONT_ORIGIN', publicOrigin(3000)],
  ['ADMIN_ORIGIN', publicOrigin(3002)],
  ['STOREFRONT_BASE_URL', publicOrigin(3000)],
  ['ERROR_MONITORING_PROVIDER', 'structured_log'],
  ['METRICS_BEARER_TOKEN', randomCredential()],
  ['API_JSON_BODY_LIMIT_BYTES', '131072'],
  ['READINESS_TIMEOUT_MS', '1000'],
  ['REQUEST_TIMEOUT_MS', '15000'],
  ['HEADERS_TIMEOUT_MS', '10000'],
  ['KEEP_ALIVE_TIMEOUT_MS', '5000'],
  ['TRUST_PROXY_HOPS', '0'],
  ['CALLBACK_RATE_LIMIT_PER_MINUTE', '120'],
  ['OTP_VERIFY_RATE_LIMIT_PER_MINUTE', '60'],
  ['RATE_LIMIT_MAX_KEYS', '10000'],
  ['PROVIDER_CONNECT_TIMEOUT_MS', '3000'],
  ['PROVIDER_REQUEST_TIMEOUT_MS', '10000'],
  ['KELE_TYPOGRAPHY', 'elize'],
  ['IDENTITY_SIGNING_SECRET', randomCredential()],
  ['OTP_VERIFIER_PEPPER', randomCredential()],
  ['ADMIN_SESSION_PROVIDER', 'development_static'],
  ['ADMIN_SUPER_SESSION_TOKEN', randomCredential()],
  ['ADMIN_INVENTORY_SESSION_TOKEN', randomCredential()],
  ['ADMIN_INSTAGRAM_SESSION_TOKEN', randomCredential()],
];

await mkdir(path.dirname(output), { recursive: true });
await writeFile(
  output,
  `# Generated inside GitHub Codespaces. Synthetic demo only; never commit.\n${values
    .map(([key, value]) => `${key}=${value}`)
    .join('\n')}\n`,
  { encoding: 'utf8', mode: 0o600, flag: 'wx' },
);
process.stdout.write(`Generated guarded configuration ${outputRelative}.\n`);
printUrls();
