# Deployment, migration, backup, and rollback runbook

Version: 0.2
Status: Provider boundaries approved; external certification pending

## Environments

- Local: Docker Compose, fake payment/SMS, local S3-compatible storage.
- CI: isolated ephemeral PostgreSQL and storage.
- Staging: production-shaped, synthetic data, real provider sandbox.
- Production: private database/storage, managed secrets, monitored workloads.

Staging and production must not share credentials, databases, buckets, callback
URLs, or customer data.

The optional Cloudflare Quick Tunnel profile documented in
`cloudflare-quick-tunnel-demo.md` provides a synthetic functional-UAT boundary
from an operator workstation. Its random
public URLs have no Cloudflare Access policy and therefore must contain only
synthetic data and be shared only with intended testers. Quick Tunnel is not a
staging, availability, backup, provider or release-image certification.

Production configuration MUST reject Fake Payment and Fake SMS adapters during
startup. Production deployment remains blocked until both real providers pass
sandbox/verification acceptance.

## Release artifact

Build immutable, versioned container images for API, storefront and admin.
Record Git commit, image digest, schema migration version, and release time.
Containers run as non-root and expose health endpoints.

The root `Dockerfile` supplies `api-runtime`, `storefront-runtime` and
`admin-runtime` targets. The build stage is pinned to the repository Node
version and produces the OpenSSL 3 Prisma Client. Runtime targets use the pinned
distroless Debian 12 CC digest, copy that exact Node binary, run as
`65532:65532`, contain no shell/package manager, carry OCI
version/revision/build-time labels and use absolute Node entrypoints and
liveness checks. Build with the same non-secret public origins intended for the
target environment:

```text
docker build --target api-runtime --build-arg VCS_REF=<commit> --build-arg BUILD_DATE=<utc> -t kele-api:<commit> .
docker build --target storefront-runtime --build-arg VCS_REF=<commit> --build-arg BUILD_DATE=<utc> --build-arg NEXT_PUBLIC_API_BASE_URL=<https-api-url> --build-arg API_BASE_URL=<https-api-url> --build-arg STOREFRONT_ORIGIN=<https-storefront-origin> -t kele-storefront:<commit> .
docker build --target admin-runtime --build-arg VCS_REF=<commit> --build-arg BUILD_DATE=<utc> --build-arg API_BASE_URL=<https-api-url> --build-arg STOREFRONT_ORIGIN=<https-storefront-origin> -t kele-admin:<commit> .
```

The API image includes the locked Prisma CLI, schema, migrations and generated
client so the reviewed image can execute the explicit one-shot migration step:

```text
node node_modules/prisma/build/index.js migrate deploy --schema prisma/schema.prisma
```

Do not run that command automatically in every API replica. The CI
`release-image-scan` job builds all three targets, records their image IDs and
revision labels, scans OS and application packages for High/Critical findings
with an immutable Trivy Action SHA, and retains the three JSON reports for 30
days. A release remains blocked until that job passes for the reviewed commit;
after registry publication, record the registry digest rather than a mutable
tag.

For an independent local preflight, scan the exact images with the same
High/Critical OS-and-library scope and retain one JSON report per target. On
Docker Desktop for Windows, exporting the image first avoids relying on a
container-to-host Docker socket mount:

```text
docker save --output <report-directory>/<target>.tar kele-<target>:<commit>
docker run --rm -v trivy-cache:/root/.cache/trivy -v <report-directory>:/reports aquasec/trivy:0.69.3 image --skip-version-check --scanners vuln --pkg-types os,library --severity HIGH,CRITICAL --format json --output /reports/<target>.json --exit-code 1 --input /reports/<target>.tar
```

Delete the temporary tar after a successful scan; retain the JSON, its SHA-256,
the local image ID, scanner version/database time and OCI revision label. A
local pass is useful independent evidence but never substitutes for the
required CI artifact or a registry digest.

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

## Milestone 9 release gate and operator controls

ADR-0005 closes OQ-002-PROD, OQ-003-PROD, OQ-017, OQ-018 and OQ-022. Production
or staging nevertheless remains `NO-GO` until the selected Vandar, Kavenegar,
private observability cluster, Arvan bucket/CDN and administrator-recovery
certifications pass for the reviewed image. Do not work around a startup failure
by selecting a Fake adapter, local MinIO, structured-log-only monitoring or a
static administrator token. Approval and local contract tests are not sandbox
certification.

Apply the additive administrator migrations
`20260807152000_milestone_9_administrator_identity` and
`20260808100000_m9_administrator_session_revocation` before selecting
`ADMIN_SESSION_PROVIDER=postgres_otp`. The second installs the database trigger
that revokes active sessions in the same transaction as a role or enabled-state
change. Do not reverse either migration after any administrator challenge,
session or identity-audit fact exists; application rollback leaves both tables
and triggers in place.

Before starting an approved release, validate all Milestone 9 variables listed
in `docs/engineering-foundation.md`, retrieve secrets through the approved
secret manager, and run configuration validation without printing values.
`HEADERS_TIMEOUT_MS` must be lower than `REQUEST_TIMEOUT_MS`; every public URL
must be HTTPS; proxy hops and exact storefront/admin origins must match the
reviewed ingress topology. Do not rotate credentials during a normal code
deployment.

Metrics are scraped from `GET /api/v1/metrics` with the dedicated bearer
credential over the private operational network. A 401 is an authentication
failure; a 503 means the database snapshot could not complete within the
bounded readiness timeout. Never place the metrics token in a URL, dashboard,
ticket or log. Initial engineering alerts are:

| Signal                        | Trigger                                            | Severity/owner                 | Immediate checks and recovery                                                                                                                    |
| ----------------------------- | -------------------------------------------------- | ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| API 5xx ratio                 | over 2% for 5 minutes                              | SEV-2, API on-call             | compare route/status-class and correlation events; recover below 1% for 10 minutes                                                               |
| API p95 latency               | over 1 second for 10 minutes                       | SEV-2, API/DB on-call          | check in-flight, DB locks/connections and slow queries; recover below 500 ms for 10 minutes                                                      |
| `kele_database_ready`         | zero for 2 minutes                                 | SEV-1, platform/DB             | keep liveness distinct, test DB path/readiness and fail traffic away; recover at one for 5 minutes                                               |
| OTP dispatch failure          | over 5% for 10 minutes or no accepted sends        | SEV-2, identity/provider owner | check provider status and limits with correlation only; recover below 1% for 15 minutes                                                          |
| OTP/callback limiting         | over 20% for 10 minutes                            | SEV-2, security/API            | check abuse pattern, ingress IP fidelity and key saturation; do not raise limits during incident                                                 |
| Callback verification failure | 5 events in 5 minutes                              | SEV-1, payment/security owner  | preserve provider evidence outside application logs, verify endpoint/clock/key version; recover after verified traffic and reconciliation review |
| Reconciliation                | any case older than 15 minutes or backlog above 10 | SEV-1, payments/operations     | stop duplicate customer action, query approved provider truth and preserve facts; close only through reviewed resolution                         |
| Failed/exhausted jobs         | any failed job for 5 minutes                       | SEV-2, API operations          | inspect type/age/attempt and correlation, repair dependency, then use idempotent retry procedure                                                 |
| Reservation expiry lag        | over 60 seconds for 5 minutes                      | SEV-2, checkout/inventory      | check worker lease and DB load; confirm no negative/over-reserved inventory after recovery                                                       |
| Refund failure                | any failure for 5 minutes                          | SEV-1, payments/returns        | do not claim refund success; preserve pending fact and retry only with a new reviewed key after provider truth                                   |
| Storage/media failure         | any sustained error for 5 minutes                  | SEV-2, platform/content        | stop new upload claims, retain existing immutable metadata, check approved bucket/CDN health                                                     |

Diagnosis starts with `X-Correlation-Id`; search structured technical events,
then immutable audit/business facts. Never request a mobile number, OTP,
session, address, callback signature or raw payload in chat/tickets. Event
labels are bounded; business IDs belong only in access-controlled fact lookup.

Provider outage procedure: keep callback verification reachable, do not switch
to Fake, do not report payment/SMS/refund success, observe pending/reconciliation
state, and follow the approved provider inquiry/runbook. If no provider is yet
approved, the only valid state is launch blocked. Database outage keeps
liveness available and readiness unavailable; traffic is removed before any
restart decision.

Run local recovery evidence only with:

```text
pnpm test:m9:recovery
```

The command destroys/recreates only `kele_m9_empty` and `kele_m9_restore`,
reads only synthetic `kele_e2e`, refuses non-loopback hosts, applies all
migrations, verifies the embedded SHA-256 hash, records the outer artifact
SHA-256 hash, and probes restored
counts, non-negative inventory and verified-payment-only Orders. Its JSON
artifact plus migrations form an application logical rehearsal backup; it is
not the production backup product. Production requires separately approved,
encrypted managed backups/PITR, retention, access tests and business RPO/RTO.
Use `docs/m9-production-approval-record.md` for the required service decision,
measured managed-rehearsal evidence and accountable approvals.

Rollback selects the reviewed Milestone 8 application artifacts while retaining
the additive database schema and every immutable fact. Verify API readiness,
storefront/admin smoke, callback reachability, reconciliation visibility and
inventory invariants before reopening traffic. Never reverse migrations after
commercial writes and never disable callback ingestion. Roll forward if the
older artifact cannot safely understand current facts. Trigger rollback for a
SEV-1 security/integrity finding, verified callback loss, negative inventory,
readiness failure over five minutes, 5xx over 5% for five minutes or p95 over
2 seconds for ten minutes. Release recovery requires all signals below their
recovery thresholds for ten minutes and an incident/reconciliation owner.

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
  Never configure this fake adapter in production. ADR-0005 selects Vandar, but
  production deployment stays blocked until the merchant IPG/Refund account,
  callback domain, credentials and sandbox certification pass.
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

- Rollout precondition: this is the first M6 release and the deployed revision
  must be the reviewed Milestone 5 baseline. If an environment ran an earlier,
  uncommitted M6 mutation build, stop rollout and design a reviewed fact/receipt
  backfill; do not attempt to replay those commands through the hardened API.
- Apply `20260804124000_milestone_6_operations_fulfillment_returns` after all
  Milestone 5 migrations, then
  `20260804170000_m6_internal_fact_key_namespace` and
  `20260804171000_m6_command_receipt_immutability`. The first migration is
  additive, backfills one created timeline fact per existing Order and installs
  update-rejection triggers. The second only widens
  `inventory_movements.idempotency_key` from 120 to 160 characters for the
  disjoint internal fact-key namespace; the third rejects receipt updates in
  PostgreSQL. Verify the Order backfill count equals the pre-migration Order
  count, the final column limit is 160 and the receipt trigger exists.
- Before enabling staff writes, smoke one paid-to-delivered transition with a
  tracking revision, one exact-boundary return, one rejection, one failed Fake
  refund followed by confirmed retry, Instagram sale/return and a bulk preview
  whose stale target reports `partial_failed`.
- Monitor refund attempts stuck in `pending_provider` or `failed`, returns in
  `refund_pending`, illegal transition/version-conflict rates, expired bulk
  previews, partial failures, `IDEMPOTENCY_KEY_REUSED` rates and any inventory
  constraint rejection. Search by Order number/correlation ID in the audit
  explorer and inspect the immutable command receipt before intervention.
- A legitimate network replay must resend the same raw key and canonically
  equivalent normalized command semantics. Never edit or delete a receipt to force a
  changed target/payload through. After a failed/pending provider outcome, an
  operator starts the explicit refund-retry command with a new key; replaying
  the prior approval/cancellation/retry key intentionally performs no second
  provider call.
- Never change an Order snapshot, ReturnRequest declaration, RefundAttempt,
  timeline/tracking fact, price fact or inventory movement to repair state.
  Recovery uses idempotent commands and the provider inquiry/retry path.
- ADR-0005 selects Vandar Refund v3. Production refund activation remains
  blocked until the merchant Refund capability, wallet/limits, credentials and
  real success/failure/retry certification pass. The Fake Refund adapter proves
  orchestration only and must not be described as a real refund.
- Code rollback keeps the additive tables and migrations in place. Put every M6
  mutation route into read-only/disabled mode first, including staff operations,
  inventory/bulk endpoints and customer `POST /me/returns`. A rollback to the
  reviewed M5 image is safe because it exposes no M6 mutation routes; do not run
  an earlier, pre-hardening M6 image that can bypass canonical receipts. Preserve
  audit/provider facts and reconcile pending refunds/stock. Do not reverse the
  migration after any Milestone 6 write without an approved export and
  destructive-migration plan.
  Canonical receipts reuse the pre-existing `command_receipts` table. Keep the
  160-character Inventory movement widening in place after any M6 fact is
  written; shrinking it would truncate/reject the 133-character internal keys.
  Any image used during recovery must preserve receipt and fact rows.

## Incident minimum

1. Stabilize customer and business data.
2. Stop unsafe writes if necessary.
3. Preserve logs, audit events and provider references.
4. Reconcile inventory, payment and orders.
5. Communicate confirmed facts only.
6. Write a blameless incident review with corrective actions.
