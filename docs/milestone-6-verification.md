# Milestone 6 verification — operations, fulfillment and returns

Date: 2026-08-04  
Branch: `feat/m06-operations-fulfillment-returns`  
Base: clean local `main` at `c726a77` (Milestone 5)

## Delivered scope

- server-authorized Order administration with optimistic versions and the
  explicit graph `Paid -> Preparing -> Shipped -> Delivered`; `Paid` and
  `Preparing` may cancel, while terminal/backward/skipped transitions fail;
- append-only tracking revisions, customer-visible tracking and immutable Order
  timeline facts;
- customer-owned return submission at the inclusive 24-hour delivery boundary,
  with exact quantities and all three required declarations;
- administrator approve/reject, provider-neutral refund attempts/retries and
  confirmed-only completion/cancellation wording;
- cancellation/return inventory restoration through SKU ledgers, including
  immutable Outfit component expansion;
- Instagram sale and return actions restricted to the Instagram role;
- searchable actor/entity/payload audit exploration;
- persisted, expiring and version-validated price/inventory bulk previews with
  per-target partial-failure reporting;
- Persian RTL staff and customer Order/return surfaces with loading, empty,
  error, unavailable, disabled/busy and success states.

## Transition and rule coverage

`operations.unit.test.ts` enumerates 36 status pairs: six allowed edges and 30
forbidden transitions. PostgreSQL integration covers allowed replay, skipped and
backward transitions, pre/post-shipment cancellation restrictions, exact
24-hour eligibility and +1 ms expiry, false condition declarations, item and
customer ownership, repeated commands, failed refund then confirmed retry,
single inventory restoration, price preview/replay, stale-target partial
failure, payload audit search, concurrent last-stock Instagram sales and
Instagram return.

Primary mapped rules: `ORD-005–ORD-013`, `ORD-017`, `RTE-001–RTE-005`,
`CUS-005`, `PAY-001–PAY-002`, `INV-008–INV-014`, `INV-018`,
`PRC-008–PRC-010`, `EVT-001–EVT-007`, `CMS-002–CMS-005` and
`LOC-001–LOC-002`.

## Migration

`20260804124000_milestone_6_operations_fulfillment_returns` is additive. It
adds lifecycle/refund/bulk enums, Order version/delivery fields, timeline,
tracking, return/refund/attempt and bulk tables, constraints/indexes, existing
Order timeline backfill and update-rejection triggers for historical facts.
Both local deploy and a clean isolated E2E reset applied all 11 migrations.

Rollback retains the migration and facts. Disable M6 mutation routes and roll
back application images; never reverse the migration after operational writes
without an approved export and destructive-migration plan.

## Automated evidence

| Gate                                        | Result                                 |
| ------------------------------------------- | -------------------------------------- |
| format / lint / TypeScript                  | passed                                 |
| unit                                        | 12 files, 78 tests passed              |
| PostgreSQL integration                      | 6 files, 29 tests passed               |
| OpenAPI / generated contract                | valid; 2 contract tests passed         |
| architecture                                | passed                                 |
| API, storefront and admin production builds | passed                                 |
| Playwright production-build acceptance      | 14 tests passed in isolated `kele_e2e` |
| dependency and secret scan                  | passed                                 |

Playwright screenshots are under `output/playwright/milestone-6/`: delivered
staff Order, staff audit search, submitted/completed customer return, mobile
empty state and an independent CLI mobile capture. The CLI snapshot confirmed
`lang="fa-IR"`, `dir="rtl"` and no horizontal overflow at 390×844.

## Commit evidence

- `53242b6 docs(operations): define milestone 6 contracts`
- `33e9abe feat(operations): implement fulfillment returns and refunds`
- `67ac01e feat(operations): add staff and customer service journeys`

No push, merge, deployment or production credential was used.

## Residual risks

- The desktop runner exposed Node 24.14.0 while the repository pins 24.18.0.
  The complete gate suite passed on that maintained Node 24 release and pnpm
  11.18.0; obtaining the exact patch-level portable runtime timed out. CI must
  remain the authoritative exact-runtime check before review or merge.
- OQ-002-PROD remains open. The Fake Refund adapter proves local/test
  orchestration only; it cannot support a real-refund claim or production
  activation.
- The conservative lifecycle graph and cancellation boundary are recorded in
  `docs/milestone-6-plan.md`. A broader state model requires a frozen rule or
  accepted ADR rather than a silent implementation change.
- Operational fact deletion/retention is intentionally not exposed. Any future
  privacy-erasure interaction needs an approved retention design that preserves
  statutory financial and audit facts.
- Bulk apply can finish `partial_failed` by design. Operators must inspect each
  failure and create a fresh preview; they must not repair projections directly.
