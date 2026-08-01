# Testing strategy

Version: 0.1
Status: Required baseline

## Test pyramid

### Domain unit tests

Fast tests for publication rules, money, lifecycle state machines, size
mapping, outfit availability, order transitions, and return limits. Domain
tests use no NestJS container, Prisma, network, or clock globals.

### Application tests

Test command/query handlers with controlled repositories, clock, ID generator,
and event publisher. Verify authorization policy calls, transaction behavior,
idempotency, and emitted facts.

### PostgreSQL integration tests

Run against a real supported PostgreSQL version. Cover Prisma mappings,
constraints, indexes, transactions, concurrent reservations, migrations, and
repository behavior. SQLite is not a substitute.

### API contract tests

Validate requests/responses against `openapi.yaml`, error envelopes,
authentication, pagination, idempotency, and backward compatibility.

### End-to-end tests

Use a real browser and production-like applications for:

- browse and select SKU;
- anonymous cart then OTP login/merge;
- checkout reservation and expiry;
- successful, failed, duplicate and tampered payment callbacks;
- order history;
- administrator product publish;
- inventory correction with audit;
- return approval;
- homepage and Journal publication.

## Critical test matrix

| Risk | Required evidence |
|---|---|
| Last unit sold concurrently | Parallel database integration test; one success only |
| Reservation expires during payment | Defined reconciliation result; no silent oversell |
| Duplicate payment callback | Same Order returned; one deduction and one revenue fact |
| Price changes after cart | Checkout uses current quote and informs customer |
| Outfit component unavailable | Whole outfit size unavailable; no partial reservation |
| Return submitted twice | Idempotent decision; quantity never exceeds purchased |
| Return after 24-hour deadline | Rejected using server time and recorded delivery timestamp |
| Return condition declaration missing | Request rejected without inventory/refund changes |
| Local Courier outside Tehran | Method absent/rejected server-side |
| Shipping setting changes after checkout | Checkout/Order retains original policy snapshot |
| Free-shipping threshold boundary | Equality qualifies against Products/Outfits subtotal; shipping, discounts and taxes do not affect eligibility |
| Guest/user cart collision | Deterministic and idempotent; quantity caps notify, unavailable lines block, Outfit Revision is preserved |
| Fake provider in production config | Application fails closed before accepting traffic |
| Admin outside role | API denies and records appropriate security/audit signal |
| Published object edited | storefront freshness behavior meets PUB-011 |

## Frontend quality

- Component tests focus on behavior, not implementation details.
- E2E covers critical user journeys.
- Automated accessibility scan supplements keyboard/manual review.
- Visual regression baselines use deterministic fixtures and fixed viewports.
- Performance budgets are measured on production builds.

Acceptance viewports:

- 390 × 844 mobile
- 768 × 1024 tablet
- 1280 × 800 small laptop
- 1440 × 900 desktop

All frontend suites run with `lang="fa-IR"` and `dir="rtl"`. Include mixed
Persian/Latin values such as SKU codes, mobile numbers and Order identifiers.

Initial budgets, subject to measurement:

- no horizontal overflow at acceptance viewports;
- storefront LCP target at or below 2.5 seconds on the agreed test profile;
- CLS at or below 0.1;
- INP target at or below 200 ms;
- no critical accessibility violation.

## Fixtures

Create deterministic factories for products, variants, sizes, inventory,
outfits, customers and orders. Do not use production personal data. Image
fixtures have stable dimensions and focal points.

## Rule traceability

Each test title or metadata includes applicable rule IDs, for example:

```text
[INV-003][CRT-002] adding to cart does not reserve stock
[INV-006] expired checkout releases reserved quantity once
[RTE-001] return at exactly the 24-hour boundary remains eligible
[SHP-002] Tehran Local Courier is unavailable outside Tehran
```

The traceability document is updated when a rule becomes implemented.

## CI tiers

- Pull request: format, lint, type-check, unit, integration, architecture,
  OpenAPI, builds and smoke E2E.
- Main: full E2E, accessibility, visual regression and migration test.
- Release: security scans, backup/restore readiness, staging smoke and manual
  business acceptance.

## Milestone 1 harnesses

- `test` covers configuration rejection and provider-port behavior without a
  Nest container or database.
- `test:integration` applies Prisma migrations to PostgreSQL 16 and verifies
  the technical seed ledger is idempotent; it cannot fall back to SQLite. Local
  Compose uses a PostgreSQL 16 mirror and CI uses `postgres:16-alpine`, so both
  environments cover the same supported major version. The gate intentionally
  does not run `prisma generate`: generation happens before application
  processes start, while the integration gate only migrates and tests. This
  avoids attempting to replace a Windows Prisma DLL held by a running API.
- `test:architecture` scans API domain/application source for prohibited
  NestJS, Prisma, HTTP and storage imports.
- `openapi:validate`, generated transport types and `test:contract` keep the
  foundation health transport shape checked against the contract.
- `test:e2e` starts production builds in a browser, checks both `fa-IR` RTL
  roots and mixed-direction identifiers, then checks correlation propagation
  on API liveness. It also writes eight reviewable production screenshots to
  `output/playwright/milestone-1/` at desktop, small-laptop, tablet, and mobile
  acceptance viewports.
- Before browser startup, `test:e2e` performs a test-guarded catalog reset and
  reconciles the one deterministic Milestone 2 Product/Category fixture inside
  the disposable `E2E_DATABASE_URL` database named `kele_e2e`. The runner never
  resets normal `DATABASE_URL`; both runner and seed reject missing, shared or
  incorrectly named database targets before deletion. An API assertion confirms
  no additional Product, Category or Media row exists before any visual capture.
  Repeated runs therefore cannot accumulate random publish workflow rows or
  overwrite evidence with a different catalog list.

## Milestone 3 harnesses

- Domain unit tests cover OTP verifier behavior and every CRT-013–CRT-018 merge
  branch, including zero inventory and immutable Outfit Revision review.
- PostgreSQL integration tests cover abuse limits, expiry, failed-attempt
  exhaustion, replay, session fixation/logout, CSRF, horizontal address
  authorization, current price/inventory, no reservation, stale concurrent
  cart updates, deterministic/replayed/foreign merge and checkout blockers.
- Browser tests use only the guarded `kele_e2e` database. They replace a single
  challenge verifier after the Fake SMS boundary accepted dispatch; this
  avoids a plaintext OTP store, log or test-only HTTP backdoor while still
  exercising the real sign-in form and verification endpoint.
- Production-build Playwright acceptance covers the anonymous-to-authenticated
  journey, merge cap notification, profile/address management, revoked logout
  token, missing-CSRF rejection, drawer Escape behavior, RTL and horizontal
  overflow at 390 x 844, 768 x 1024, 1280 x 800 and 1440 x 900.
- Separate contexts capture loading, empty, dependency error, unavailable SKU
  and exact Outfit Revision `requires_review` states. Evidence is written to
  `output/playwright/milestone-3/`; an independent Playwright CLI snapshot
  verifies the mobile semantic tree and document direction.
