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

## Incident minimum

1. Stabilize customer and business data.
2. Stop unsafe writes if necessary.
3. Preserve logs, audit events and provider references.
4. Reconcile inventory, payment and orders.
5. Communicate confirmed facts only.
6. Write a blameless incident review with corrective actions.
