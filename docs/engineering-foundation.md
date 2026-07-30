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

`test:integration` migrates a real PostgreSQL 16 database and never substitutes
SQLite or a mock. Local Compose uses the configured PostgreSQL 16 mirror; CI
uses the official `postgres:16-alpine` image. Both exercise the same supported
major version. `seed` may run repeatedly: its technical
`SeedLedger` record is upserted once per seed version. The first migration only
creates that technical ledger; it creates no commercial/catalog data. For this
additive local-only migration, rollback is dropping `SeedLedger` only when no
later migration references it; production migrations require the runbook's
expand-and-contract review.

## Configuration

All variables are required and validated by `@kele/config` before API startup.
`.env.example` contains safe local values only.

| Variable                                               | Purpose                                                                                                          |
| ------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------- |
| `NODE_ENV`                                             | `development`, `test`, or `production`; production is intentionally rejected until real provider adapters exist. |
| `PORT`                                                 | API listener port.                                                                                               |
| `DATABASE_URL`                                         | PostgreSQL connection string.                                                                                    |
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
desktop (1440 × 900), tablet (768 × 1024), and mobile (390 × 844). The browser
smoke test covers the same three viewports.

M1 renders only static engineering shells: no route fetches data, submits a
command, selects inventory, or exposes a business action. Consequently,
loading, empty, error, unavailable, disabled, and success states are not
truthful/applicable UI states yet; adding artificial variants would be a fake
success path. They are explicitly required when the first data-backed catalog
or administration workflow is introduced. M1 does verify the meaningful shell
states: successful static render, Persian RTL root, mixed-direction identifier,
responsive composition, and visible keyboard focus styling.
