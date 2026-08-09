import { z } from 'zod';

const runtimeEnvironment = z.enum(['development', 'test', 'production']);
const deploymentTier = z.enum(['uat', 'staging', 'production']);

export const environmentSchema = z
  .object({
    NODE_ENV: runtimeEnvironment.default('development'),
    KELE_DEPLOYMENT_TIER: deploymentTier.optional(),
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
    STORAGE_PROVIDER: z.enum(['minio', 'arvan_s3']).default('minio'),
    STORAGE_PUBLIC_BASE_URL: z.url().optional(),
    ARVAN_CDN_API_TOKEN: z.string().min(1).optional(),
    PAYMENT_PROVIDER: z.enum(['fake', 'vandar']),
    REFUND_PROVIDER: z.enum(['fake', 'vandar']).default('fake'),
    VANDAR_IPG_API_KEY: z.string().min(1).optional(),
    VANDAR_REFUND_ACCESS_TOKEN: z.string().min(1).optional(),
    VANDAR_REFUND_REFRESH_TOKEN: z.string().min(1).optional(),
    VANDAR_BUSINESS_NAME: z
      .string()
      .regex(/^[A-Za-z0-9][A-Za-z0-9_-]{1,63}$/)
      .optional(),
    VANDAR_IPG_BASE_URL: z.url().default('https://ipg.vandar.io'),
    VANDAR_API_BASE_URL: z.url().default('https://api.vandar.io'),
    PAYMENT_CALLBACK_BASE_URL: z.url().optional(),
    FAKE_PAYMENT_SIGNING_SECRET: z
      .string()
      .min(32)
      .default('development-fake-payment-signing-secret-0001'),
    SMS_PROVIDER: z.enum(['fake', 'kavenegar']),
    KAVENEGAR_API_KEY: z.string().min(1).optional(),
    KAVENEGAR_OTP_TEMPLATE: z
      .string()
      .regex(/^[A-Za-z0-9]+$/)
      .default('KeleOtp'),
    PROVIDER_CONNECT_TIMEOUT_MS: z.coerce.number().int().min(500).max(10_000).default(3_000),
    PROVIDER_REQUEST_TIMEOUT_MS: z.coerce.number().int().min(1_000).max(30_000).default(10_000),
    FAKE_SMS_OTP_CODE: z
      .string()
      .regex(/^\d{6}$/)
      .default('111111'),
    API_BASE_URL: z.url(),
    NEXT_PUBLIC_API_BASE_URL: z.url(),
    STOREFRONT_ORIGIN: z.url().default('http://localhost:3000'),
    ADMIN_ORIGIN: z.url().default('http://localhost:3002'),
    ERROR_MONITORING_PROVIDER: z
      .enum(['structured_log', 'self_hosted_grafana'])
      .default('structured_log'),
    LOKI_PUSH_URL: z.url().optional(),
    LOKI_TENANT_ID: z.string().min(1).optional(),
    LOKI_PUSH_TOKEN: z.string().min(1).optional(),
    GRAFANA_ADMIN_BOOTSTRAP_SECRET: z.string().min(32).optional(),
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
    ADMIN_SESSION_PROVIDER: z
      .enum(['development_static', 'postgres_otp'])
      .default('development_static'),
    ADMIN_SESSION_SIGNING_SECRET: z.string().min(32).optional(),
    ADMIN_OTP_VERIFIER_PEPPER: z.string().min(32).optional(),
    ADMIN_BOOTSTRAP_TOKEN_HASH: z
      .string()
      .regex(/^[0-9a-f]{64}$/i)
      .optional(),
  })
  .superRefine((value, context) => {
    const effectiveDeploymentTier = value.KELE_DEPLOYMENT_TIER ?? value.NODE_ENV;
    const productionConfiguration = effectiveDeploymentTier === 'production';
    const productionShapedConfiguration =
      effectiveDeploymentTier === 'staging' || productionConfiguration;

    if (value.KELE_DEPLOYMENT_TIER !== undefined && value.NODE_ENV !== 'production') {
      context.addIssue({
        code: 'custom',
        path: ['KELE_DEPLOYMENT_TIER'],
        message: 'An explicit deployment tier requires NODE_ENV=production.',
      });
    }

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

    if (productionShapedConfiguration && value.PAYMENT_PROVIDER === 'fake') {
      context.addIssue({
        code: 'custom',
        path: ['PAYMENT_PROVIDER'],
        message: 'The fake payment provider is forbidden in production.',
      });
    }

    if (productionShapedConfiguration && value.SMS_PROVIDER === 'fake') {
      context.addIssue({
        code: 'custom',
        path: ['SMS_PROVIDER'],
        message: 'The fake SMS provider is forbidden in production.',
      });
    }

    if (productionShapedConfiguration && value.REFUND_PROVIDER === 'fake') {
      context.addIssue({
        code: 'custom',
        path: ['REFUND_PROVIDER'],
        message: 'The fake refund provider is forbidden in production.',
      });
    }

    if (productionShapedConfiguration && value.STORAGE_PROVIDER === 'minio') {
      context.addIssue({
        code: 'custom',
        path: ['STORAGE_PROVIDER'],
        message: 'Local MinIO is forbidden in production.',
      });
    }

    if (productionShapedConfiguration && value.ERROR_MONITORING_PROVIDER === 'structured_log') {
      context.addIssue({
        code: 'custom',
        path: ['ERROR_MONITORING_PROVIDER'],
        message: 'Structured-log-only monitoring is forbidden in production.',
      });
    }

    if (
      productionShapedConfiguration &&
      value.ADMIN_SESSION_PROVIDER === 'development_static' &&
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

    if (productionShapedConfiguration && value.ADMIN_SESSION_PROVIDER === 'development_static') {
      context.addIssue({
        code: 'custom',
        path: ['ADMIN_SESSION_PROVIDER'],
        message: 'Development static administrator sessions are forbidden in production.',
      });
    }

    if (productionShapedConfiguration && value.METRICS_BEARER_TOKEN.startsWith('development-')) {
      context.addIssue({
        code: 'custom',
        path: ['METRICS_BEARER_TOKEN'],
        message: 'The development metrics credential is forbidden in production.',
      });
    }

    if (
      productionShapedConfiguration &&
      (value.IDENTITY_SIGNING_SECRET.startsWith('development-') ||
        value.OTP_VERIFIER_PEPPER.startsWith('development-'))
    ) {
      context.addIssue({
        code: 'custom',
        path: ['IDENTITY_SIGNING_SECRET'],
        message: 'Development identity secrets are forbidden in production.',
      });
    }

    const requireValue = (key: keyof typeof value, message: string): void => {
      if (value[key] === undefined || value[key] === '') {
        context.addIssue({ code: 'custom', path: [key], message });
      }
    };

    if (value.PAYMENT_PROVIDER === 'vandar') {
      requireValue('VANDAR_IPG_API_KEY', 'VANDAR_IPG_API_KEY is required for Vandar payment.');
      requireValue(
        'PAYMENT_CALLBACK_BASE_URL',
        'PAYMENT_CALLBACK_BASE_URL is required for Vandar payment.',
      );
    }
    if (value.REFUND_PROVIDER === 'vandar') {
      requireValue(
        'VANDAR_REFUND_ACCESS_TOKEN',
        'VANDAR_REFUND_ACCESS_TOKEN is required for Vandar refunds.',
      );
      requireValue('VANDAR_BUSINESS_NAME', 'VANDAR_BUSINESS_NAME is required for Vandar refunds.');
      requireValue(
        'VANDAR_REFUND_REFRESH_TOKEN',
        'VANDAR_REFUND_REFRESH_TOKEN is required for operator-managed Vandar token rotation.',
      );
    }
    if (value.SMS_PROVIDER === 'kavenegar') {
      requireValue('KAVENEGAR_API_KEY', 'KAVENEGAR_API_KEY is required for Kavenegar SMS.');
    }
    if (value.ERROR_MONITORING_PROVIDER === 'self_hosted_grafana') {
      requireValue('LOKI_PUSH_URL', 'LOKI_PUSH_URL is required for self-hosted monitoring.');
      requireValue('LOKI_TENANT_ID', 'LOKI_TENANT_ID is required for self-hosted monitoring.');
      requireValue('LOKI_PUSH_TOKEN', 'LOKI_PUSH_TOKEN is required for self-hosted monitoring.');
    }
    if (value.STORAGE_PROVIDER === 'arvan_s3') {
      requireValue(
        'STORAGE_PUBLIC_BASE_URL',
        'STORAGE_PUBLIC_BASE_URL is required for Arvan storage.',
      );
      requireValue('ARVAN_CDN_API_TOKEN', 'ARVAN_CDN_API_TOKEN is required for Arvan CDN.');
    }
    if (value.ADMIN_SESSION_PROVIDER === 'postgres_otp') {
      requireValue(
        'ADMIN_SESSION_SIGNING_SECRET',
        'ADMIN_SESSION_SIGNING_SECRET is required for PostgreSQL admin sessions.',
      );
      requireValue(
        'ADMIN_OTP_VERIFIER_PEPPER',
        'ADMIN_OTP_VERIFIER_PEPPER is required for PostgreSQL admin sessions.',
      );
    }

    if (value.HEADERS_TIMEOUT_MS >= value.REQUEST_TIMEOUT_MS) {
      context.addIssue({
        code: 'custom',
        path: ['HEADERS_TIMEOUT_MS'],
        message: 'HEADERS_TIMEOUT_MS must be lower than REQUEST_TIMEOUT_MS.',
      });
    }

    if (value.PROVIDER_CONNECT_TIMEOUT_MS >= value.PROVIDER_REQUEST_TIMEOUT_MS) {
      context.addIssue({
        code: 'custom',
        path: ['PROVIDER_CONNECT_TIMEOUT_MS'],
        message: 'PROVIDER_CONNECT_TIMEOUT_MS must be lower than PROVIDER_REQUEST_TIMEOUT_MS.',
      });
    }

    if (productionConfiguration) {
      for (const [key, raw] of [
        ['API_BASE_URL', value.API_BASE_URL],
        ['NEXT_PUBLIC_API_BASE_URL', value.NEXT_PUBLIC_API_BASE_URL],
        ['STOREFRONT_ORIGIN', value.STOREFRONT_ORIGIN],
        ['ADMIN_ORIGIN', value.ADMIN_ORIGIN],
        ['STORAGE_ENDPOINT', value.STORAGE_ENDPOINT],
        ...(value.PAYMENT_CALLBACK_BASE_URL === undefined
          ? []
          : ([['PAYMENT_CALLBACK_BASE_URL', value.PAYMENT_CALLBACK_BASE_URL]] as const)),
        ...(value.STORAGE_PUBLIC_BASE_URL === undefined
          ? []
          : ([['STORAGE_PUBLIC_BASE_URL', value.STORAGE_PUBLIC_BASE_URL]] as const)),
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
