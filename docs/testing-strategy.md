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
| Free-shipping threshold boundary | Equality qualifies; amount basis follows OQ-013 resolution |
| Guest/user cart collision | Deterministic, idempotent result after OQ-014 resolution |
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
