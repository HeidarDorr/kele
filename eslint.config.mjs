import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: [
      '**/dist/**',
      '**/.next/**',
      '**/.next-e2e/**',
      '**/coverage/**',
      '**/.data/**',
      '**/node_modules/**',
      '**/*.mjs',
      'packages/api-contract/src/generated.ts',
    ],
  },
  eslint.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  {
    files: ['**/*.{ts,mts,tsx}'],
    languageOptions: {
      parserOptions: {
        projectService: {
          allowDefaultProject: ['*.config.ts', 'apps/api/vitest.integration.config.ts'],
        },
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-floating-promises': 'error',
    },
  },
  {
    files: ['apps/**/test/**/*.ts', 'e2e/**/*.ts'],
    rules: {
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
    },
  },
  {
    files: ['apps/api/src/**/*.module.ts'],
    rules: {
      // Nest module classes are metadata carriers and intentionally have no members.
      '@typescript-eslint/no-extraneous-class': 'off',
    },
  },
  {
    files: ['apps/api/src/infrastructure/prisma/**/*.ts'],
    rules: {
      // Prisma's generated client is confined to infrastructure by the architecture test.
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      '@typescript-eslint/require-await': 'off',
    },
  },
  {
    files: ['apps/api/src/platform/health/health.service.ts'],
    rules: {
      // Health is the only platform-level caller of the infrastructure-owned Prisma client.
      '@typescript-eslint/no-unsafe-call': 'off',
    },
  },
  {
    files: ['*.config.ts', 'apps/**/*.config.ts'],
    rules: {
      '@typescript-eslint/no-unsafe-member-access': 'off',
    },
  },
);
