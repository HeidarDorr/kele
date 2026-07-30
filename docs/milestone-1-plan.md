# Milestone 1 implementation plan

Status: Complete — verified on 2026-07-30  
Branch: `feat/m01-engineering-foundation`  
Baseline: `main` at `e03d3cf242b393e131a376c3ae17b862b59076ba`

## Scope and traceability

This plan implements only Milestone 1 of `docs/roadmap.md`. It establishes the
engineering foundation for later catalog, identity, cart, checkout, and
editorial milestones; it does not expose those business workflows.

Applicable foundation requirements: ADR-0001; LOC-001 and LOC-002; PAY-001
through PAY-003; SMS-001 through SMS-002; the security, testing, deployment,
design-system and UI-acceptance baselines. No additional business-rule IDs are
implemented in this milestone.

## Acceptance criteria

1. A clean clone with Node.js `24.18.0` (maintained LTS at implementation time)
   and pnpm `11.18.0` can install
   from the lockfile and run the API, storefront, and administration app using
   documented commands.
2. The workspace has only the justified baseline applications and packages:
   NestJS API, Next.js storefront, Next.js administration, transport contract,
   shared config, design tokens, and testing support. TypeScript is strict
   throughout.
3. Docker Compose starts supported PostgreSQL 16 and MinIO deterministically for local
   development; the documented configuration is validated before the API
   accepts traffic.
4. The API has `/api/v1/health/live` and `/api/v1/health/ready`, a structured
   JSON logger, request/job correlation IDs, and readiness fails when PostgreSQL
   is unavailable.
5. Prisma is isolated in API infrastructure. Automated architecture tests fail
   if domain/application code imports NestJS, Prisma, HTTP, or storage SDK
   packages.
6. Fake Payment and Fake SMS implement provider-neutral application ports.
   They are permitted only for development/test and production configuration
   fails closed before serving requests.
7. A deterministic, idempotent development seed records its applied seed
   version in PostgreSQL without creating commercial/catalog features.
8. Both Next apps render `lang="fa-IR"`, `dir="rtl"`, use logical CSS and KELE
   foundation tokens, with a mixed-direction identifier demonstration covered
   by tests.
9. Unit, real-PostgreSQL integration, OpenAPI contract, architecture, and
   browser smoke harnesses are executable. CI runs formatting, lint,
   type-check, unit/integration/architecture/contract checks, production builds,
   E2E smoke, OpenAPI validation, dependency audit, and secret scan.
10. Setup, configuration, architecture boundaries, CI, health/seed, security,
    migration/rollback, and traceability documentation are current.

## Failure cases that must be proven

- unsupported Node.js or a package-manager version different from the pinned
  one fails before dependency installation;
- missing, malformed, or production-incompatible configuration prevents API
  startup;
- readiness returns failure when PostgreSQL cannot be reached while liveness
  remains process-local;
- a supplied correlation ID is preserved and an absent/malformed one is safely
  replaced; response and JSON logs carry the resolved ID;
- a prohibited framework/Prisma import in domain or application is detected by
  the boundary test;
- fake provider configuration in production is rejected, and fake adapters do
  not require or emit production credentials;
- repeating the seed does not add another seed record;
- invalid OpenAPI fails the validation command; response shape of the health
  endpoint is checked against the contract;
- each app production build succeeds and its smoke page keeps Persian RTL and
  isolates mixed Persian/Latin identifiers;
- PostgreSQL integration tests fail fast rather than silently falling back to
  SQLite or a mocked database.

## Verification plan

Run from a fresh `pnpm install --frozen-lockfile` after local Docker services
are healthy: format check, lint, strict type-check, unit test, PostgreSQL
integration test, architecture test, OpenAPI validation, contract test,
production builds, E2E smoke, dependency audit, and secret scan. Record exact
commands/results in the completion evidence.

## Completion evidence

The frozen lockfile install and all listed gates passed on the milestone branch.
The PostgreSQL 16 integration harness applied migration
`20260730000000_milestone_1_seed_ledger`, then verified the seed ledger and
repeatable `seed` command. The browser smoke harness passed four tests covering
both Persian RTL applications, correlation preservation/replacement, and
dependency-aware API readiness. No production credentials, provider, deploy,
push, or merge were performed.
