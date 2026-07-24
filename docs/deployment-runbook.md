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

## Release artifact

Build immutable, versioned container images for API, storefront and admin.
Record Git commit, image digest, schema migration version, and release time.
Containers run as non-root and expose health endpoints.

## Pre-deployment

1. Confirm CI and security gates.
2. Review migration lock time, table rewrites, backfill and rollback strategy.
3. Verify environment variables and provider callback URLs.
4. Confirm recent successful backup and restore-test status.
5. Define release owner, observer, rollback threshold and communication path.
6. Run staging smoke tests using the exact release artifact.

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

## Incident minimum

1. Stabilize customer and business data.
2. Stop unsafe writes if necessary.
3. Preserve logs, audit events and provider references.
4. Reconcile inventory, payment and orders.
5. Communicate confirmed facts only.
6. Write a blameless incident review with corrective actions.

