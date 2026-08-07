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
| Sensitive M6 key reused for another command/target/version/payload | 409 `IDEMPOTENCY_KEY_REUSED`; receipt and every secondary projection/fact/provider-call count remain unchanged |
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
- Browser tests use only the guarded `kele_e2e` database and enter the same
  configured fixed Fake SMS code shown by the non-production sign-in page.
  They do not rewrite challenge records and require no plaintext OTP store,
  log or test-only HTTP backdoor.
- Production-build Playwright acceptance covers the anonymous-to-authenticated
  journey, merge cap notification, profile/address management, revoked logout
  token, missing-CSRF rejection, drawer Escape behavior, RTL and horizontal
  overflow at 390 x 844, 768 x 1024, 1280 x 800 and 1440 x 900.
- Separate contexts capture loading, empty, dependency error, unavailable SKU
  and exact Outfit Revision `requires_review` states. Evidence is written to
  `output/playwright/milestone-3/`; an independent Playwright CLI snapshot
  verifies the mobile semantic tree and document direction.

## Milestone 4 harnesses

- Shipping/payment unit tests cover free-shipping equality and below-threshold
  boundaries, disabled methods, Persian/Arabic Tehran normalization, local
  courier rejection, valid HMAC, forged payload and stale timestamp.
- `checkout.integration.test.ts` runs on PostgreSQL and exercises the real
  transaction context, repositories and database constraints. It asserts one
  winner for concurrent last-unit holds; one immutable Order for parallel exact
  callback replay; monotonic paid state under late failure; rejection of a new
  transaction; server repricing and snapshot immutability; expiry/success race;
  amount mismatch; incomplete reservation; one-time expiry; job lease/retry;
  and unavailable/review Cart blocking.
- Every concurrency test queries Order count, reconciliation count, callback
  receipts, reservation state and physical/reserved inventory. HTTP success by
  itself is insufficient evidence.
- Production-build Playwright uses the guarded `kele_e2e` database for the full
  Product Cart → OTP → Address → Checkout → Fake Provider → Result → Order
  journey. The same attempt is driven through pending, failed, cancelled and
  success to verify out-of-order handling; isolated journeys cover tampered
  amount/reconciliation and expired reservation.
- Browser assertions also read PostgreSQL evidence: success creates one Order,
  four receipts, physical `4 -> 3` and reserved `1 -> 0`; amount tampering
  creates zero Orders, one reconciliation and no physical deduction; expiry
  creates no Order and releases the hold.
- M4 visual evidence is stored in `output/playwright/milestone-4/`, including
  Checkout at 390×844, 768×1024 and 1440×900, fake gateway, every payment
  outcome and the immutable paid Order. Reduced-motion and horizontal-overflow
  acceptance remain mandatory.

### Deterministic M3/M4 visual-evidence contract

Acceptance criteria:

- M3 and M4 use distinct, named fixture objects and can write only beneath
  `output/playwright/milestone-3/` and `output/playwright/milestone-4/`
  respectively. An M4 test must never receive the M3 evidence directory.
- Each run resets only the configuration-guarded `kele_e2e` database before
  migrations and seed, preventing abandoned Checkout/customer facts from a
  failed prior run from contaminating either milestone fixture.
- The E2E API uses the fixed instant `2026-08-02T09:00:00.000Z` and a scoped,
  repeatable UUID sequence. These controls are rejected outside `NODE_ENV=test`.
- Every M3/M4 capture uses the Tehran timezone, Persian locale, light color
  scheme, reduced motion, loaded fonts and images, disabled animation/transition,
  top scroll position, hidden caret, an explicit focus policy and three stable
  layout frames before PNG encoding.
- After the accepted evidence baseline is committed, two consecutive complete
  E2E runs must each leave `git diff --exit-code -- output/playwright` at zero.
- Presentation-state fixtures are available only to the E2E runner through a
  fresh per-run server token and private request headers. Public query
  parameters are inert, and production deployments do not configure the token.

Failure scenarios include an unloaded font/image, changing layout signature,
unexpected focus ring or caret, real-time date, random visible identifier,
cross-milestone output path, or any byte change in tracked Playwright evidence.
Any such difference fails evidence acceptance even when the functional browser
assertions pass.

## Milestone 6 operations harnesses

- `operations.unit.test.ts` enumerates all 36 pairs in the six-state Order
  lifecycle and proves the six allowed edges and 30 forbidden edges with a
  stable illegal-transition code.
- `operations.integration.test.ts` uses PostgreSQL locks and real repositories
  for fulfillment replay, cancellation restoration, exact 24-hour and +1 ms
  return boundaries, false declarations, ownership isolation, failed-refund
  retry/replay, cancellation-versus-transition serialization, concurrent
  partial-return confirmation, tracking scope and normalization, price
  preview/read RBAC, stale and synchronized concurrent inventory partial
  failure, searchable audit payloads and concurrent Instagram stock updates.
  Catalog integration separately proves the role/action matrix before command
  receipts or ledger writes.
- Canonical-fingerprint unit tests pin the version-1 SHA-256 envelope and prove
  recursive object-key normalization plus command/target/version/payload
  separation. PostgreSQL negative tests reuse one raw key across different
  Orders, tracking payloads, customer Orders, ReturnRequests, decisions,
  Refunds, bulk previews and SKUs. Across that negative matrix the suite
  snapshots the relevant projection, timeline/tracking/movement/audit facts,
  immutable receipt and provider-call count to prove zero secondary mutation.
  Exact tracking and reject-decision replay are explicit, an overlong refund
  reason proves zero provider calls, a failed refund retry replay proves one
  provider call/attempt until a new key is chosen, and a parallel
  different-Order claim proves one global receipt winner.
- Browser acceptance uses the guarded `kele_e2e` database and production builds.
  It signs in a customer, creates a paid Order, drives staff preparation,
  shipment/tracking and delivery, submits a customer return, approves it through
  the staff UI, verifies provider-confirmed refund visibility and searches the
  immutable audit trail. Anonymous/Instagram/Inventory role failures and allowed
  Instagram return/sale actions are asserted at the API boundary. Strict
  malformed-`If-Match` rejection proves the Order remains unchanged. The same
  production API path also proves exact inventory replay and literal HTTP 409
  plus `IDEMPOTENCY_KEY_REUSED` for a changed quantity. Fixture teardown removes
  its Order/Return/Refund and Instagram command receipts, movements and audit
  facts so a second run exercises a fresh allowed effect before replay.
- RTL, `fa-IR`, reduced motion, no horizontal overflow, semantic controls and
  loading/empty/error/unavailable/success states are covered. Evidence is stored
  in `output/playwright/milestone-6/`; an independent Playwright CLI snapshot
  and mobile screenshot verify the semantic tree and direction.
- The M6 evidence contract uses one named fixture for the customer, Order,
  checkout/payment facts, tracking copy, transition/return copy and exactly four
  dynamic visual baselines. API facts use the shared fixed clock and an
  insertion-ordered, operations-scoped deterministic UUID factory; browser and
  server formatting use the Tehran timezone. Timeline and audit assertions pin
  IDs, timestamps and equal-time ordering before capture. Accepted baselines
  must survive two consecutive complete E2E runs with both the Playwright output
  diff and the whole worktree remaining clean after each run.
- Visual acceptance retries are disabled. A race, layout instability or failed
  capture must fail that run instead of producing evidence from a continued
  deterministic-ID sequence on a retry.

## Milestone 9 hardening harnesses

- `test:m9:acceptance` builds API/storefront/admin, resets only the guarded
  `kele_e2e` database, runs `e2e/milestone-9.spec.ts` through Playwright, then
  runs local synthetic load profiles while those production builds are
  serving. The harness refuses a non-loopback target and requires the literal
  `isolated-kele-e2e` confirmation.
- Browser acceptance proves protected metrics, correlation, security headers,
  exact CORS, 413 bounds, anonymous administration denial, remote-Media denial,
  RTL production smoke and local CLS/LCP/navigation budgets at 390x844,
  768x1024, 1280x800 and 1440x900. The ignored `browser.json` artifact records
  the viewport, layout-shift, largest-contentful-paint, DOM-ready and horizontal
  overflow observations; INP is explicitly marked unobserved when the smoke has
  no qualifying interaction. The complete E2E suite remains the evidence for
  customer payment/Order and staff fulfillment/return/refund journeys, loading,
  empty, error, unavailable and success states, replay, CSRF, IDOR and role
  matrices.
- `scripts/run-m9-load.mjs` records runtime, host shape, concurrency, duration,
  request count, throughput, unexpected-error ratio and p50/p95/p99/max for
  all five approved profiles: public reads, bounded OTP abuse, independent
  authenticated Checkout writes, exact/altered parallel callback replay and
  authorized operator reads. Read profiles fail at 1% or more unexpected errors
  or p95 at/above 500 ms; transactional profiles use the same error bound and a
  1,000 ms p95 bound. Checkout evidence verifies one active reservation per
  successful Checkout. Callback evidence verifies one Order, one callback
  receipt and valid physical/reserved inventory. The harness refuses any
  non-loopback target or database other than `kele_e2e`.
- Interactive Prisma transactions use a five-second acquisition bound and a
  ten-second execution bound; the integration runner allows fifteen seconds so
  intentional 16-way contention measures the application transaction policy
  instead of Vitest's shorter default. Last-unit contention, refund outage and
  job retry behavior remain covered by the PostgreSQL concurrency suites. A
  real-provider load/certification profile remains blocked by its OQ decision.
- `test:m9:recovery` refuses non-loopback PostgreSQL and any database outside
  `kele_e2e`, `kele_m9_empty` and `kele_m9_restore`. It migrates empty/restore
  databases, writes a versioned logical synthetic-data artifact with an
  embedded SHA-256, restores in one transaction, and compares counts plus
  inventory/payment invariants. Trigger suppression is transaction-local to
  the isolated restore because immutable-history triggers correctly reject
  ordinary historical inserts.
- Evidence is ignored under `output/playwright/.e2e-run/milestone-9/`; committed
  verification records contain measurements and hashes but never the backup,
  credentials, cookies, callback bodies or personal data.
