import { randomBytes } from 'node:crypto';

const suppliedArguments = process.argv.slice(2);
if (suppliedArguments[0] === '--') suppliedArguments.shift();
const [applicationId, administratorMobile = '+989000000001', ...extraArguments] = suppliedArguments;

if (
  extraArguments.length > 0 ||
  applicationId === undefined ||
  !/^[a-z0-9](?:[a-z0-9-]{1,61}[a-z0-9])?$/.test(applicationId)
) {
  throw new Error(
    'Usage: node scripts/generate-liara-uat-env.mjs <liara-app-id> [synthetic-admin-mobile]',
  );
}
if (!/^\+98[0-9]{10}$/.test(administratorMobile)) {
  throw new Error('The synthetic administrator mobile must use +98 followed by 10 digits.');
}

const credential = () => randomBytes(48).toString('base64url');
const origin = `https://${applicationId}.liara.run`;
const values = [
  ['NODE_ENV', 'production'],
  ['KELE_DEPLOYMENT_TIER', 'uat'],
  ['KELE_UAT_BOOTSTRAP', 'synthetic-only'],
  ['KELE_UAT_ADMIN_MOBILE', administratorMobile],
  ['KELE_PUBLIC_ORIGIN', origin],
  ['DATABASE_URL', '<PASTE-LIARA-PRIVATE-POSTGRESQL-URL>'],
  ['PAYMENT_PROVIDER', 'fake'],
  ['REFUND_PROVIDER', 'fake'],
  ['SMS_PROVIDER', 'fake'],
  ['FAKE_SMS_OTP_CODE', '111111'],
  ['FAKE_PAYMENT_SIGNING_SECRET', credential()],
  ['STORAGE_PROVIDER', 'minio'],
  ['STORAGE_ENDPOINT', 'https://storage.invalid'],
  ['STORAGE_REGION', 'uat-disabled'],
  ['STORAGE_BUCKET', 'kele-uat-media'],
  ['STORAGE_ACCESS_KEY', 'synthetic-uat-unused'],
  ['STORAGE_SECRET_KEY', 'synthetic-uat-unused'],
  ['ERROR_MONITORING_PROVIDER', 'structured_log'],
  ['METRICS_BEARER_TOKEN', credential()],
  ['IDENTITY_SIGNING_SECRET', credential()],
  ['OTP_VERIFIER_PEPPER', credential()],
  ['ADMIN_SESSION_PROVIDER', 'postgres_otp'],
  ['ADMIN_SESSION_SIGNING_SECRET', credential()],
  ['ADMIN_OTP_VERIFIER_PEPPER', credential()],
  ['KELE_TYPOGRAPHY', 'estedad-vazirmatn'],
];

process.stdout.write(`${values.map(([name, value]) => `${name}=${value}`).join('\n')}\n`);
process.stderr.write(
  'Generated new UAT-only credentials. Replace DATABASE_URL, store values only in Liara, and do not commit the output.\n',
);
