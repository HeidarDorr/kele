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
    PAYMENT_PROVIDER: z.literal('fake'),
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

    if (
      value.NODE_ENV === 'production' &&
      value.ADMIN_SUPER_SESSION_TOKEN.startsWith('development-')
    ) {
      context.addIssue({
        code: 'custom',
        path: ['ADMIN_SUPER_SESSION_TOKEN'],
        message: 'Development administrator sessions are forbidden in production.',
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
  });

export type Environment = z.infer<typeof environmentSchema>;

export function parseEnvironment(input: NodeJS.ProcessEnv): Environment {
  return environmentSchema.parse(input);
}
