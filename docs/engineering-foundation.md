# Engineering foundation

Milestone 1 establishes a pnpm workspace with independently buildable
applications under `apps/api`, `apps/storefront`, and `apps/admin`. The only
shared packages are transport types (`@kele/api-contract`), validated runtime
configuration (`@kele/config`), KELE CSS tokens (`@kele/design-system`), and
test helpers (`@kele/testing`). Shared packages must not contain business
behavior.

## Prerequisites and clean setup

Use Node.js `24.18.0` and Corepack-managed pnpm `11.18.0`, pinned in `.nvmrc`
and `package.json` respectively. The preinstall check rejects another runtime
or package-manager version.

```powershell
corepack enable
corepack prepare pnpm@11.18.0 --activate
Copy-Item .env.example .env
corepack pnpm@11.18.0 install --frozen-lockfile
docker compose up -d --wait postgres minio
docker compose run --rm minio-init
corepack pnpm@11.18.0 seed
```

The `minio-init` one-shot service creates `kele-development` idempotently. It
uses only documented local development credentials. Never use this Compose
configuration or its credentials outside local development.

## Commands

| Purpose                    | Command                                                                                                                                                                                       |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| API development            | `corepack pnpm@11.18.0 --filter @kele/api dev`                                                                                                                                                |
| Storefront development     | `corepack pnpm@11.18.0 --filter @kele/storefront dev`                                                                                                                                         |
| Administration development | `corepack pnpm@11.18.0 --filter @kele/admin dev`                                                                                                                                              |
| All quality gates          | `corepack pnpm@11.18.0 format:check`, `lint`, `typecheck`, `test`, `test:integration`, `test:architecture`, `openapi:validate`, `test:contract`, `build`, `test:e2e`, `audit`, `scan:secrets` |
| Stop local services        | `docker compose down`                                                                                                                                                                         |

If another local service owns one of the E2E defaults (API `3001`, storefront
`3000`, administration `3002`), use the test-only `E2E_API_PORT`,
`E2E_STOREFRONT_PORT`, and/or `E2E_ADMIN_PORT` overrides. They affect only the
isolated production-build harness; for example,
`$env:E2E_STOREFRONT_PORT='3100'; corepack pnpm@11.18.0 test:e2e`. Each value
is validated before the harness starts and must be an integer from `1` through
`65535`.

`test:integration` migrates a real PostgreSQL 16 database and never substitutes
SQLite or a mock. Local Compose uses the configured PostgreSQL 16 mirror; CI
uses the official `postgres:16-alpine` image. Both exercise the same supported
major version. Prisma Client generation is an install/bootstrap concern and is
run explicitly in CI before application processes start; integration and seed
runtime gates do not replace the Windows query-engine DLL, so they remain
runnable while a local API process holds the generated client open.

`seed` may run repeatedly: its technical `SeedLedger` and fixed catalog rows are
upserted and reconciled rather than skipped or duplicated. `test:e2e` builds
against the centralized root `.env`, uses isolated ports by default, and
replaces the active database URL with the dedicated `E2E_DATABASE_URL`. The
runner requires the distinct database name `kele_e2e`, creates it idempotently
when absent, and the seed independently verifies `NODE_ENV=test` plus exact URL
equality before clearing catalog-only test data. The normal `DATABASE_URL` is
therefore never a reset target. The runner then recreates exactly the documented
Milestone 2 fixture before Playwright starts.
Its internal `KELE_E2E_BUILD` flag keeps Next artifacts in ignored `.next-e2e`
directories, and the runner owns and closes each isolated server process tree
before restoring Next's generated declarations and returning the test result.
The first migration only creates the technical ledger; production migrations
still require the runbook's expand-and-contract review.

## Configuration

All variables are required and validated by `@kele/config` before API startup.
`.env.example` contains safe local values only.

| Variable                                               | Purpose                                                                                                          |
| ------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------- |
| `NODE_ENV`                                             | `development`, `test`, or `production`; production is intentionally rejected until real provider adapters exist. |
| `PORT`                                                 | API listener port.                                                                                               |
| `DATABASE_URL`                                         | PostgreSQL connection string.                                                                                    |
| `E2E_DATABASE_URL`                                     | Dedicated disposable PostgreSQL database; must be distinct and named exactly `kele_e2e`.                         |
| `STORAGE_ENDPOINT`, `STORAGE_REGION`, `STORAGE_BUCKET` | S3-compatible storage target; MinIO locally.                                                                     |
| `STORAGE_ACCESS_KEY`, `STORAGE_SECRET_KEY`             | Storage credentials; secrets outside local development belong in secret management.                              |
| `PAYMENT_PROVIDER`, `SMS_PROVIDER`                     | Currently only `fake` for development/test; rejected in production.                                              |
| `API_BASE_URL`, `NEXT_PUBLIC_API_BASE_URL`             | API base URL for server/client transport configuration.                                                          |

## Boundaries and runtime behavior

API modules use `domain`, `application`, `infrastructure`, and `presentation`
when business modules are introduced. The architecture check rejects NestJS,
Prisma, HTTP, and storage imports from `domain` and `application`; Prisma stays
in `apps/api/src/infrastructure/prisma`.

`GET /api/v1/health/live` is process-local. `GET /api/v1/health/ready` runs a
small PostgreSQL query and returns `503` if it cannot serve traffic. Every API
response contains `X-Correlation-Id`: a valid incoming UUID is preserved;
otherwise one is generated. JSON logs include that ID and redact sensitive
field names. Fake Payment and Fake SMS are application-port implementations;
they have no production credentials and production config fails before the API
binds a listener.

Both Next.js roots set `lang="fa-IR"` and `dir="rtl"`. Their shared token CSS
uses the provisional KELE palette and logical properties, while identifiers use
bidirectional isolation.

## Milestone 1 visual evidence and UI states

Reviewable screenshots are captured from production builds in
`output/playwright/milestone-1/`: storefront and administration roots at
desktop (1440 × 900), small laptop (1280 × 800), tablet (768 × 1024), and
mobile (390 × 844). The browser smoke test covers the same four viewports.

M1 renders only static engineering shells: no route fetches data, submits a
command, selects inventory, or exposes a business action. Consequently,
loading, empty, error, unavailable, disabled, and success states are not
truthful/applicable UI states yet; adding artificial variants would be a fake
success path. They are explicitly required when the first data-backed catalog
or administration workflow is introduced. M1 does verify the meaningful shell
states: successful static render, Persian RTL root, mixed-direction identifier,
responsive composition, and visible keyboard focus styling.
