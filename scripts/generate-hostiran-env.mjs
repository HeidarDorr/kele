import { randomBytes } from 'node:crypto';

const suppliedArguments = process.argv.slice(2);
if (suppliedArguments[0] === '--') suppliedArguments.shift();
const [domain, administratorMobile = '+989000000001', ...extraArguments] = suppliedArguments;

const hostnamePattern =
  /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/;

if (extraArguments.length > 0 || domain === undefined || !hostnamePattern.test(domain)) {
  throw new Error(
    'Usage: node scripts/generate-hostiran-env.mjs <domain> [synthetic-admin-mobile]\nExample: node scripts/generate-hostiran-env.mjs shop.example.com +989121234567',
  );
}
if (!/^\+98[0-9]{10}$/.test(administratorMobile)) {
  throw new Error('The synthetic administrator mobile must use +98 followed by 10 digits.');
}

const credential = () => randomBytes(48).toString('base64url');
const postgresPassword = randomBytes(24).toString('base64url');
const storageAccessKey = `kele-${randomBytes(12).toString('hex')}`;
const storageSecretKey = randomBytes(32).toString('base64url');
const publicOrigin = `https://${domain}`;

const values = [
  ['KELE_DOMAIN', domain],
  ['POSTGRES_PASSWORD', postgresPassword],
  ['NODE_ENV', 'production'],
  ['KELE_DEPLOYMENT_TIER', 'uat'],
  ['KELE_UAT_BOOTSTRAP', 'synthetic-only'],
  ['KELE_UAT_ADMIN_MOBILE', administratorMobile],
  ['KELE_PUBLIC_ORIGIN', publicOrigin],
  [
    'DATABASE_URL',
    `postgresql://kele:${encodeURIComponent(postgresPassword)}@postgres:5432/kele?schema=public`,
  ],
  ['PAYMENT_PROVIDER', 'fake'],
  ['REFUND_PROVIDER', 'fake'],
  ['SMS_PROVIDER', 'fake'],
  ['FAKE_SMS_OTP_CODE', '111111'],
  ['FAKE_PAYMENT_SIGNING_SECRET', credential()],
  ['STORAGE_PROVIDER', 'minio'],
  ['STORAGE_ENDPOINT', 'http://minio:9000'],
  ['STORAGE_REGION', 'us-east-1'],
  ['STORAGE_BUCKET', 'kele-media'],
  ['STORAGE_ACCESS_KEY', storageAccessKey],
  ['STORAGE_SECRET_KEY', storageSecretKey],
  ['ERROR_MONITORING_PROVIDER', 'structured_log'],
  ['METRICS_BEARER_TOKEN', credential()],
  ['IDENTITY_SIGNING_SECRET', credential()],
  ['OTP_VERIFIER_PEPPER', credential()],
  ['ADMIN_SESSION_PROVIDER', 'postgres_otp'],
  ['ADMIN_SESSION_SIGNING_SECRET', credential()],
  ['ADMIN_OTP_VERIFIER_PEPPER', credential()],
  ['KELE_TYPOGRAPHY', 'parastoo-vazirmatn'],
  ['KELE_API_HEAP_MB', '128'],
  ['KELE_STOREFRONT_HEAP_MB', '112'],
  ['KELE_ADMIN_HEAP_MB', '96'],
];

process.stdout.write(`${values.map(([name, value]) => `${name}=${value}`).join('\n')}\n`);
process.stderr.write(
  'Generated Hostiran initial-deploy credentials. Save to deploy/hostiran/.env on the server only; do not commit.\n',
);
