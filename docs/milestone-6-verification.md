# Milestone 6 verification — operations, fulfillment and returns

Date: 2026-08-04

Branch: `feat/m06-operations-fulfillment-returns`

Base: clean reviewed local `main` at `c726a77` (Milestone 5)

Certification HEAD: `7a93d5e1819b1bdc97f914a71c60c36f9c4bf652`

## Delivered scope

- server-authorized Order administration with optimistic versions and the
  explicit graph `Paid -> Preparing -> Shipped -> Delivered`; Paid/Preparing
  cancellation completes only after provider confirmation;
- immutable tracking revisions, Order timeline and searchable audit events,
  with customer visibility restricted to owned Orders;
- customer return submission at the inclusive 24-hour delivery boundary with
  owned quantities and all three condition declarations;
- administrator approve/reject, provider-neutral Refund/RefundAttempt
  orchestration, confirmed-only completion and explicit retry after failed or
  pending provider outcomes;
- cancellation and return stock restoration through InventoryMovement ledgers,
  including immutable Outfit component expansion;
- separated Super/Inventory/Instagram role permissions, Instagram sale/return
  actions and kind-scoped price/inventory bulk preview access;
- validated, expiring bulk previews with stable SKU lock order, per-target stale
  failures and replay-safe apply;
- Persian RTL staff and customer Order/return journeys with complete UI states.

## Canonical command replay

Every sensitive M6 command hashes canonical JSON over
`{ fingerprintVersion: 1, commandType, target, version, payload }`. The global
CommandReceipt stores command type, target ID and SHA-256 request hash before a
business mutation. An exact canonical replay returns the current result without
another provider call or historical fact. Any command/target/version/payload
mismatch returns HTTP 409 `IDEMPOTENCY_KEY_REUSED` before mutation.

| Command                             | Target                         | Version              | Covered mismatch/no-secondary evidence                                                                    |
| ----------------------------------- | ------------------------------ | -------------------- | --------------------------------------------------------------------------------------------------------- |
| fulfillment transition/cancellation | Order number                   | submitted `If-Match` | other Order, version and payload; timeline, projection, receipt, gateway and restoration counts unchanged |
| tracking revision                   | Order number                   | submitted `If-Match` | other Order and tracking payload; revision/timeline/audit counts unchanged                                |
| customer return submission          | authenticated customer + Order | `null`               | other owner/Order and reason/items; no ReturnRequest or timeline on the second Order                      |
| approve/reject return               | ReturnRequest ID               | `null`               | other Return, decision type and reason; no provider, decision, inventory or audit effect                  |
| refund retry                        | Refund ID                      | `null`               | other Refund and reason; exact failed replay makes one provider call/attempt, recovery requires a new key |
| bulk apply                          | BulkOperation ID               | submitted `If-Match` | other preview and version; no second item loop, movement or apply event                                   |
| inventory action                    | SKU ID                         | `null`               | other SKU and quantity; projection, movement, audit and receipt remain unchanged                          |

Raw keys are 16–120 characters. Derived timeline/tracking/inventory fact keys use
the deterministic 133-character `m6f:` namespace in 160-character columns, so a
client key cannot collide with an internal fact identity. PostgreSQL rejects
CommandReceipt updates.

## Transition, clock, role and concurrency coverage

- `operations.unit.test.ts` enumerates all 36 state pairs: six allowed edges and
  30 forbidden edges.
- PostgreSQL tests cover exact transition/tracking replay, skipped/backward and
  terminal transitions, strict quoted safe `If-Match`, tracking only at dispatch,
  blank tracking rejection and delivery requiring tracking.
- A synchronized cancellation/provider race proves a pending/failed cancellation
  blocks fulfillment and a late confirmation cannot overwrite shipment.
- Return tests cover exactly `deliveredAt + 24h`, `+1 ms`, false declarations,
  ownership, duplicate/excess quantity, approve/reject replay and cross-command
  reuse. Two concurrent partial-return confirmations serialize on the Order and
  append exactly one `Delivered -> Returned` transition.
- Refund tests cover provider failure, exact failed replay, deliberate new-key
  retry, confirmed replay, overlong reason, other-Refund/payload reuse and one
  restoration only.
- Inventory tests cover role/action separation, concurrent Instagram last-stock
  updates, no-negative invariants and canonical cross-SKU/payload reuse.
- Bulk tests cover preview permissions, price-preview read isolation, exact
  replay, expiry/version/target mismatch, stale targets and a synchronized
  concurrent Inventory CAS that commits `partial_failed` without losing successful
  item results.

Primary mapped rules are `ORD-005–ORD-013`, `ORD-017`, `RTE-001–RTE-005`,
`CUS-005`, `PAY-001–PAY-002`, `INV-008–INV-014`, `INV-018`,
`PRC-008–PRC-010`, `EVT-001–EVT-007`, `CMS-002–CMS-005` and
`LOC-001–LOC-002`.

## Migrations

Three additive M6 migrations are present and a clean E2E reset applied all 13
repository migrations twice:

1. `20260804124000_milestone_6_operations_fulfillment_returns` adds lifecycle,
   timeline, tracking, return/refund and bulk structures, constraints, indexes,
   Order timeline backfill and historical-fact update guards.
2. `20260804170000_m6_internal_fact_key_namespace` widens
   `inventory_movements.idempotency_key` from 120 to 160 characters; no value is
   rewritten.
3. `20260804171000_m6_command_receipt_immutability` adds the PostgreSQL
   CommandReceipt update-rejection trigger.

Prisma schema validation passed in both certification runs.

## Two clean certification runs

Both runs started from the clean certification HEAD with Node `24.18.0` and pnpm
`11.18.0`.

| Gate                                                  | Pass 1                     | Pass 2                     |
| ----------------------------------------------------- | -------------------------- | -------------------------- |
| format / lint / TypeScript                            | exit 0                     | exit 0                     |
| unit                                                  | 13 files, 96 tests         | 13 files, 96 tests         |
| PostgreSQL integration                                | 6 files, 42 tests          | 6 files, 42 tests          |
| architecture                                          | exit 0                     | exit 0                     |
| OpenAPI validation + regeneration diff                | valid, zero generated diff | valid, zero generated diff |
| contract                                              | 1 file, 2 tests            | 1 file, 2 tests            |
| API/storefront/admin production builds                | exit 0                     | exit 0                     |
| Prisma validation / 13-migration deploy               | exit 0                     | exit 0                     |
| dependency audit / secret scan                        | no findings                | no findings                |
| Playwright production-build acceptance                | 14/14                      | 14/14                      |
| `git diff --exit-code -- output/playwright` after E2E | exit 0                     | exit 0                     |
| `git status --short` after E2E                        | exit 0, blank              | exit 0, blank              |

## Deterministic visual evidence

The M6 browser runtime fixes the clock, locale/timezone, ordered UUID factory and
fixture IDs/data used by timeline, tracking, return, refund and audit views. The
four tracked baselines were committed only after stabilization; the two final
runs produced zero artifact drift, so no later refresh was needed.

| Baseline                                | SHA-256                                                            |
| --------------------------------------- | ------------------------------------------------------------------ |
| `staff-order-delivered-desktop.png`     | `934AF24F9A5D3510F06A01976AC82B2D95661AFC3C1C1599FA0E36F700969388` |
| `staff-audit-desktop.png`               | `FFF3E7B9D88B267A6206A20BE8637C9955B7E67EF887CF67AFDA772B5DF259F2` |
| `customer-return-submitted-desktop.png` | `57EDF27EA6AB9CB1252F38ACAED3A167A6039FFA3BCB05171A2490F7698B1F12` |
| `customer-return-completed-mobile.png`  | `2AADB802A99BA3BB64743F429A43FCA23F5584FDB336432F16381F9ACD1BEB63` |

Evidence also verifies `lang="fa-IR"`, `dir="rtl"`, keyboard/accessibility
semantics, reduced motion, required responsive viewports and no horizontal
overflow.

## Commit evidence at certification HEAD

- `53242b6 docs(operations): define milestone 6 contracts`
- `33e9abe feat(operations): implement fulfillment returns and refunds`
- `67ac01e feat(operations): add staff and customer service journeys`
- `2a0b6f2 docs(operations): record milestone 6 verification`
- `f1d3c26 test(e2e): make milestone 6 evidence deterministic`
- `7bbfdb6 test(e2e): refresh milestone 6 visual baselines`
- `b1c6c34 docs(operations): define canonical command replay`
- `ad570ed fix(contract): require tracking audit reason`
- `1d0e128 chore(contract): regenerate operations types`
- `7a93d5e feat(operations): harden sensitive command replay`

No push, merge, deployment or production credential was used. M7 was not
started.

## Risks and rollback

- `OQ-002-PROD` remains open. The Fake Refund adapter proves local/test
  orchestration only and cannot support a production or real-refund claim.
- This hardening is the first supported M6 rollout and assumes the reviewed M5
  baseline. An environment that ran an earlier uncommitted M6 mutation build
  must stop for a reviewed receipt/fact backfill.
- Failed/pending provider outcomes remain facts; recovery uses an explicit new
  retry key. Replaying the earlier approval/cancellation/retry key intentionally
  performs no second provider call.
- A `partial_failed` bulk result requires operator inspection and a fresh
  preview; projections must never be repaired directly.
- Rollback first disables every M6 mutation route, including customer
  `POST /me/returns`, staff operations and inventory/bulk routes. Roll back to
  the reviewed M5 image or a hardened M6 image, preserve all receipts/audit/
  provider facts, and reconcile pending refunds and stock.
- Do not reverse the additive migrations, drop the receipt guard or shrink the
  160-character fact columns after an M6 write; doing so can destroy historical
  evidence or reject the 133-character internal keys.
