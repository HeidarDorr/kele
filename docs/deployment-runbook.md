# Deployment, migration, backup, and rollback runbook

Version: 0.1
Status: Baseline; provider details pending

## Environments

- Local: Docker Compose, fake payment/SMS, local S3-compatible storage.
- CI: isolated ephemeral PostgreSQL and storage.
- Staging: production-shaped, synthetic data, real provider sandbox.
- Production: private database/storage, managed secrets, monitored workloads.

Staging and production must not share credentials, databases, buckets, callback
URLs, or customer data.

Production configuration MUST reject Fake Payment and Fake SMS adapters during
startup. Production deployment remains blocked until both real providers pass
sandbox/verification acceptance.

## Release artifact

Build immutable, versioned container images for API, storefront and admin.
Record Git commit, image digest, schema migration version, and release time.
Containers run as non-root and expose health endpoints.

## Pre-deployment

1. Confirm CI and security gates.
2. Review migration lock time, table rewrites, backfill and rollback strategy.
3. Verify environment variables and provider callback URLs.
4. Verify `fa-IR`/RTL configuration and approved Persian assets.
5. Confirm recent successful backup and restore-test status.
6. Define release owner, observer, rollback threshold and communication path.
7. Run staging smoke tests using the exact release artifact.

## Migration policy

Use expand-and-contract for incompatible schema changes:

1. Add backward-compatible structures.
2. Deploy code that supports old and new forms.
3. Backfill in bounded, observable batches.
4. switch reads/writes after verification.
5. Remove old structures in a later release.

Never combine an irreversible destructive migration with the only deployment
that starts using its replacement. Production migrations require explicit
approval.

## Deployment

1. Put migrations under an explicit single-run release step.
2. Apply backward-compatible migrations.
3. Deploy API and verify readiness.
4. Deploy storefront/admin.
5. Run smoke tests for catalog, OTP sandbox, checkout sandbox, admin access and
   media.
6. Observe errors, latency, job backlog and database saturation.
7. Mark release complete only after the observation window.

## Rollback

- Roll back application images by digest.
- Do not automatically reverse a data migration that may have accepted new
  writes.
- Disable a faulty feature with a controlled server-side flag only if that flag
  has been designed and tested.
- Preserve payment callbacks and inventory operations during rollback.
- Record incident timeline, affected correlations and reconciliation tasks.

## Backup and restore

- PostgreSQL: encrypted automated backups plus point-in-time recovery where the
  provider supports it.
- Object storage: versioning or protected lifecycle policy.
- Configuration: versioned non-secret config and recoverable secret-management
  procedure.
- A backup is not accepted until a restore into an isolated environment has
  succeeded.
- Define RPO/RTO with the business before production launch.

## Health and observability

Expose separate liveness and readiness checks. Readiness validates necessary
dependencies without performing expensive work. Monitor:

- HTTP rate, latency and errors;
- database connections, locks and slow queries;
- reservation expiry lag;
- payment callback verification and reconciliation backlog;
- failed/leased job counts;
- OTP send failure and rate-limit events;
- object-storage errors;
- business metrics without personal data.

Every request and job carries a correlation ID. Audit history is not replaced
by technical logs.

## Milestone 1 local operations

Use `docker compose up -d --wait postgres minio` followed by `docker compose
run --rm minio-init` for the local dependency baseline. API liveness is
`/api/v1/health/live`; readiness is `/api/v1/health/ready` and checks
PostgreSQL. Readiness failure is not a reason to restart a live process until
the dependency failure has been investigated. The first schema migration is
additive (`SeedLedger`); do not reverse it in an environment that may contain a
later migration or a seed record needed for diagnosis.

## Milestone 3 identity operations

- API startup now requires `IDENTITY_SIGNING_SECRET`, `OTP_VERIFIER_PEPPER` and
  the exact `STOREFRONT_ORIGIN`. Local/test Fake SMS uses the six-digit
  `FAKE_SMS_OTP_CODE` (default `111111`); production rejects development-prefixed
  identity secrets and the Fake SMS provider.
- Deploy migrations `20260801083005_milestone_3_identity_customer_cart` and
  `20260801123000_expand_merge_notice_quantity` before serving the M3 API.
  Both are additive, but rollback after customer writes requires an approved
  export/retention decision and must not be automated.
- Monitor generic OTP dispatch failures, rate-limit outcomes and authentication
  failures without logging mobile, OTP, session, CSRF, address or signed-cart
  values. A provider migration must implement the existing `SmsGateway` port;
  it must not change challenge/session semantics.
- Treat abnormal cart-version conflicts and repeated merge receipts as abuse or
  client-synchronization signals. They do not justify adding Redis, a queue or
  a second state store without an accepted ADR and measured need.

## Milestone 4 checkout/payment operations

- Apply migrations in order:
  `20260802073130_milestone_4_checkout_payment_order`,
  `20260802074000_callback_event_identity`, then
  `20260802074500_reservation_movement_invariants`. They add commercial tables,
  provider event identity, the one-live-Checkout index and reservation movement
  checks. They do not rewrite existing M3 customer/cart facts.
- Local/test startup requires a 32+ character `FAKE_PAYMENT_SIGNING_SECRET`.
  Never configure this fake adapter in production; production deployment stays
  blocked by configuration validation and OQ-002-PROD until a provider-specific
  ADR, verification flow, credentials and sandbox certification are approved.
- The in-process scheduler polls every 15 seconds. Jobs lease for 60 seconds,
  use `FOR UPDATE SKIP LOCKED`, permit at most eight attempts and back off from
  one minute up to 15 minutes. Monitor pending jobs past `runAt`, expired leases,
  exhausted attempts, reservation expiry lag and reconciliation age/count.
- Alert on `PAYMENT_CALLBACK_UNVERIFIED`, stale/event-collision/transaction
  mismatch rates, payment amount/currency reconciliation, active holds beyond
  expiry, `reserved > physical` constraint failures, and any Checkout with more
  than one Order (which should also be structurally impossible).
- Recovery never declares success from local state. When a reconciliation case
  exists, preserve its provider transaction and correlated Checkout/attempt,
  prevent customer retry of that Cart while its claim is live, and resolve only
  through the future approved provider inquiry/operations workflow. Do not edit
  an Order or inventory projection manually to force agreement.
- A code rollback keeps all M4 tables and the callback route available. Do not
  reverse migrations after a Checkout, receipt, reconciliation or Order exists.
  Roll back API/storefront images, continue accepting idempotent callbacks, and
  reconcile payment/stock before any separately approved data operation.

Smoke evidence for a release candidate must include one paid fake/sandbox path,
one failed path, one amount mismatch, callback replay, expiry release and owned
Order read. Production claims remain prohibited until the real provider replaces
the fake adapter; synthetic E2E shipping prices are explicitly not customer
pricing approval.

## Milestone 6 operations and refund runbook

- Apply `20260804124000_milestone_6_operations_fulfillment_returns` after all
  Milestone 5 migrations. It is additive, backfills one created timeline fact
  per existing Order and installs update-rejection triggers on new historical
  fact tables. Verify the backfill count equals the pre-migration Order count.
- Before enabling staff writes, smoke one paid-to-delivered transition with a
  tracking revision, one exact-boundary return, one rejection, one failed Fake
  refund followed by confirmed retry, Instagram sale/return and a bulk preview
  whose stale target reports `partial_failed`.
- Monitor refund attempts stuck in `pending_provider` or `failed`, returns in
  `refund_pending`, illegal transition/version-conflict rates, expired bulk
  previews, partial failures and any inventory constraint rejection. Search by
  Order number/correlation ID in the audit explorer before intervention.
- Never change an Order snapshot, ReturnRequest declaration, RefundAttempt,
  timeline/tracking fact, price fact or inventory movement to repair state.
  Recovery uses idempotent commands and the provider inquiry/retry path.
- Production refund activation remains blocked by OQ-002-PROD. The Fake Refund
  adapter proves orchestration only and must not be described as a real refund.
- Code rollback keeps the additive tables and migration in place. Disable staff
  mutation routes, roll back application images, preserve audit/provider facts
  and reconcile pending refunds/stock. Do not reverse the migration after any
  Milestone 6 write without an approved export and destructive-migration plan.

## Incident minimum

1. Stabilize customer and business data.
2. Stop unsafe writes if necessary.
3. Preserve logs, audit events and provider references.
4. Reconcile inventory, payment and orders.
5. Communicate confirmed facts only.
6. Write a blameless incident review with corrective actions.
