import { z } from 'zod';

const runtimeEnvironment = z.enum(['development', 'test', 'production']);

export const environmentSchema = z
  .object({
    NODE_ENV: runtimeEnvironment.default('development'),
    PORT: z.coerce.number().int().min(1).max(65535).default(3001),
    DATABASE_URL: z.url(),
    E2E_DATABASE_URL: z.url().optional(),
    E2E_FIXED_TIME: z.iso.datetime({ offset: true }).optional(),
    E2E_DETERMINISTIC_ID_SEED: z.string().min(16).optional(),
    STORAGE_ENDPOINT: z.url(),
    STORAGE_REGION: z.string().min(1),
    STORAGE_BUCKET: z.string().regex(/^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$/),
    STORAGE_ACCESS_KEY: z.string().min(1),
    STORAGE_SECRET_KEY: z.string().min(1),
    STORAGE_PROVIDER: z.literal('minio').default('minio'),
    PAYMENT_PROVIDER: z.literal('fake'),
    REFUND_PROVIDER: z.literal('fake').default('fake'),
    FAKE_PAYMENT_SIGNING_SECRET: z
      .string()
      .min(32)
      .default('development-fake-payment-signing-secret-0001'),
    SMS_PROVIDER: z.literal('fake'),
    FAKE_SMS_OTP_CODE: z
      .string()
      .regex(/^\d{6}$/)
      .default('111111'),
    API_BASE_URL: z.url(),
    NEXT_PUBLIC_API_BASE_URL: z.url(),
    STOREFRONT_ORIGIN: z.url().default('http://localhost:3000'),
    ADMIN_ORIGIN: z.url().default('http://localhost:3002'),
    ERROR_MONITORING_PROVIDER: z.literal('structured_log').default('structured_log'),
    METRICS_BEARER_TOKEN: z.string().min(32).default('development-metrics-bearer-token-000001'),
    API_JSON_BODY_LIMIT_BYTES: z.coerce.number().int().min(16_384).max(1_048_576).default(131_072),
    READINESS_TIMEOUT_MS: z.coerce.number().int().min(100).max(5_000).default(1_000),
    REQUEST_TIMEOUT_MS: z.coerce.number().int().min(1_000).max(60_000).default(15_000),
    HEADERS_TIMEOUT_MS: z.coerce.number().int().min(1_000).max(30_000).default(10_000),
    KEEP_ALIVE_TIMEOUT_MS: z.coerce.number().int().min(1_000).max(10_000).default(5_000),
    TRUST_PROXY_HOPS: z.coerce.number().int().min(0).max(2).default(0),
    CALLBACK_RATE_LIMIT_PER_MINUTE: z.coerce.number().int().min(10).max(1_000).default(120),
    OTP_VERIFY_RATE_LIMIT_PER_MINUTE: z.coerce.number().int().min(5).max(500).default(60),
    RATE_LIMIT_MAX_KEYS: z.coerce.number().int().min(100).max(100_000).default(10_000),
    KELE_TYPOGRAPHY: z.enum(['elize', 'markazi']).default('elize'),
    IDENTITY_SIGNING_SECRET: z
      .string()
      .min(32)
      .default('development-identity-signing-secret-00001'),
    OTP_VERIFIER_PEPPER: z.string().min(32).default('development-otp-verifier-pepper-000001'),
    ADMIN_SUPER_SESSION_TOKEN: z
      .string()
      .min(32)
      .default('development-super-admin-session-token-00000001'),
    ADMIN_INVENTORY_SESSION_TOKEN: z
      .string()
      .min(32)
      .default('development-inventory-admin-session-token-00001'),
    ADMIN_INSTAGRAM_SESSION_TOKEN: z
      .string()
      .min(32)
      .default('development-instagram-admin-session-token-00001'),
    ADMIN_SESSION_PROVIDER: z.literal('development_static').default('development_static'),
  })
  .superRefine((value, context) => {
    if (
      value.NODE_ENV !== 'test' &&
      (value.E2E_FIXED_TIME !== undefined || value.E2E_DETERMINISTIC_ID_SEED !== undefined)
    ) {
      context.addIssue({
        code: 'custom',
        path: ['E2E_FIXED_TIME'],
        message: 'Deterministic E2E runtime controls are allowed only when NODE_ENV=test.',
      });
    }

    if (value.NODE_ENV === 'production') {
      context.addIssue({
        code: 'custom',
        path: ['PAYMENT_PROVIDER'],
        message: 'The fake payment provider is forbidden in production.',
      });
    }

    if (value.NODE_ENV === 'production') {
      context.addIssue({
        code: 'custom',
        path: ['SMS_PROVIDER'],
        message: 'The fake SMS provider is forbidden in production.',
      });
    }

    if (value.NODE_ENV === 'production') {
      context.addIssue({
        code: 'custom',
        path: ['REFUND_PROVIDER'],
        message: 'The fake refund provider is forbidden in production.',
      });
      context.addIssue({
        code: 'custom',
        path: ['STORAGE_PROVIDER'],
        message: 'Local MinIO is forbidden in production until OQ-018 is approved.',
      });
      context.addIssue({
        code: 'custom',
        path: ['ERROR_MONITORING_PROVIDER'],
        message: 'Production error monitoring is blocked until OQ-017 is approved.',
      });
    }

    if (
      value.NODE_ENV === 'production' &&
      [
        value.ADMIN_SUPER_SESSION_TOKEN,
        value.ADMIN_INVENTORY_SESSION_TOKEN,
        value.ADMIN_INSTAGRAM_SESSION_TOKEN,
      ].some((token) => token.startsWith('development-'))
    ) {
      context.addIssue({
        code: 'custom',
        path: ['ADMIN_SUPER_SESSION_TOKEN'],
        message: 'Development administrator sessions are forbidden in production.',
      });
    }

    if (value.NODE_ENV === 'production') {
      context.addIssue({
        code: 'custom',
        path: ['ADMIN_SESSION_PROVIDER'],
        message: 'Development static administrator sessions are forbidden in production.',
      });
    }

    if (value.NODE_ENV === 'production' && value.METRICS_BEARER_TOKEN.startsWith('development-')) {
      context.addIssue({
        code: 'custom',
        path: ['METRICS_BEARER_TOKEN'],
        message: 'The development metrics credential is forbidden in production.',
      });
    }

    if (
      value.NODE_ENV === 'production' &&
      (value.IDENTITY_SIGNING_SECRET.startsWith('development-') ||
        value.OTP_VERIFIER_PEPPER.startsWith('development-'))
    ) {
      context.addIssue({
        code: 'custom',
        path: ['IDENTITY_SIGNING_SECRET'],
        message: 'Development identity secrets are forbidden in production.',
      });
    }

    if (value.HEADERS_TIMEOUT_MS >= value.REQUEST_TIMEOUT_MS) {
      context.addIssue({
        code: 'custom',
        path: ['HEADERS_TIMEOUT_MS'],
        message: 'HEADERS_TIMEOUT_MS must be lower than REQUEST_TIMEOUT_MS.',
      });
    }

    if (value.NODE_ENV === 'production') {
      for (const [key, raw] of [
        ['API_BASE_URL', value.API_BASE_URL],
        ['NEXT_PUBLIC_API_BASE_URL', value.NEXT_PUBLIC_API_BASE_URL],
        ['STOREFRONT_ORIGIN', value.STOREFRONT_ORIGIN],
        ['ADMIN_ORIGIN', value.ADMIN_ORIGIN],
        ['STORAGE_ENDPOINT', value.STORAGE_ENDPOINT],
      ] as const) {
        if (new URL(raw).protocol !== 'https:') {
          context.addIssue({
            code: 'custom',
            path: [key],
            message: `${key} must use HTTPS in production.`,
          });
        }
      }
    }
  });

export type Environment = z.infer<typeof environmentSchema>;

export function parseEnvironment(input: NodeJS.ProcessEnv): Environment {
  return environmentSchema.parse(input);
}
