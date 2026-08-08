# Milestone 9 production hardening plan

Version: 0.2

Status: Approved-scope implementation contract

Branch: `feat/m09-production-hardening`

Rules and decisions: ADR-0004; ADR-0005; PAY-001 to PAY-003; SMS-001 to SMS-002;
CUS-001 to CUS-005 and CUS-010; CMS-002 to CMS-005 and CMS-008 to CMS-009;
CMS-016 to CMS-017; EVT-001 to EVT-012; PRC-011 to PRC-012; ORD-001 to
ORD-004 and ORD-018; RTE-001 to RTE-005; HRD-001 to HRD-010;
OQ-002-PROD, OQ-003-PROD, OQ-017, OQ-018 and OQ-022.

## Scope gate and provider decisions

Decision update (2026-08-08): accepted ADR-0005 closes all five selection
questions. External tenant/account certification and managed-service recovery
evidence remain blockers exactly as specified by the acceptance criteria;
approval and local contract evidence are not certification.

| Decision      | Approved boundary                                                      | Remaining Milestone 9 gate                                                                              |
| ------------- | ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `OQ-002-PROD` | Vandar IPG v3 and Refund v3                                            | Real merchant sandbox/refund capability, settlement evidence and `CERT-M9-001` callback/inquiry safety. |
| `OQ-003-PROD` | Kavenegar Verify Lookup                                                | Real account, approved template/sender and delivery evidence.                                           |
| `OQ-017`      | KELE-managed Grafana/Loki/Prometheus in Iran                           | Regional private deployment, retention, redaction and alert delivery/acknowledgement.                   |
| `OQ-018`      | Private Arvan Simin Object Storage/CDN                                 | Real bucket/CDN access, encryption, versioning, lifecycle, invalidation and malware behavior.           |
| `OQ-022`      | First-party PostgreSQL principals and revocable Kavenegar OTP sessions | Production bootstrap, lower-role lifecycle, two-person break-glass and real SMS factor.                 |

No provider was purchased, configured with a real credential or represented as
certified by local implementation. Production and staging remain `NO-GO` until
provider-specific acceptance, managed PostgreSQL recovery and the remote CI
release-image scan are executed and retained.

## Acceptance criteria

### Provider boundary

- **M9-AC-001:** Production startup fails closed when Fake Payment, Fake Refund
  or Fake SMS is selected, without echoing configuration values.
- **M9-AC-002:** Payment, refund and SMS orchestration depends only on existing
  application ports. Provider SDK types do not enter domain or application
  contracts, and adding a future adapter requires no commercial-domain change.
- **M9-AC-003:** A provider-specific implementation is accepted only after its
  OQ decision records protocol, credentials, callback/inquiry verification,
  amount/currency semantics, timeout/retry limits, retention, redaction and
  commercial constraints.
- **M9-AC-004:** Sandbox certification must prove initiation, authenticated
  callback/delivery, exact replay, altered replay, stale event, timeout,
  provider outage, inquiry/reconciliation and secret-redaction behavior. Until
  then the certification result is explicitly `blocked`, never simulated.
- **M9-AC-005:** Provider telemetry uses bounded low-cardinality outcomes and
  opaque internal correlation. It contains no mobile number, OTP, session or
  CSRF token, address, callback signature, credential, raw payload or payment
  instrument data.

### Security and abuse resistance

- **M9-AC-006:** Authentication retains generic responses, verifier-only OTP
  persistence, resend/attempt limits, session rotation and revocation, secure
  production cookies and CSRF enforcement. Production configuration rejects
  fixed OTP and development-prefixed secrets.
- **M9-AC-007:** Customer and administration authorization remains deny-by-
  default. Automated negative tests cover anonymous access, cross-customer
  IDOR and every lower-role attempt against representative high-impact routes.
- **M9-AC-008:** Callback handling verifies authenticity before commercial
  mutation, bounds request size and parsing, rejects unsupported provider,
  stale/forged/altered events and preserves exact replay/idempotency and
  monotonic paid state.
- **M9-AC-009:** Media registration and deletion reject unknown fields,
  unsupported formats, unsafe remote URLs and invalid dimensions; SVG remains
  unavailable. Existing reference-race protection remains fail closed. A real
  binary upload is not claimed until its storage provider and malware/decoder
  pipeline are approved.
- **M9-AC-010:** API and both web applications emit explicit CSP, frame,
  content-type, referrer, permissions and transport-security policy appropriate
  to their environment. CORS is an exact-origin allowlist and credentials are
  never combined with a wildcard.
- **M9-AC-011:** Rate limits cover OTP challenge/verification and payment
  callback abuse with bounded storage and fail-closed policy. Rejections expose
  a stable problem code and safe metric without disclosing the keyed identity.
- **M9-AC-012:** Production logs and error responses redact secrets and personal
  data recursively, never expose stack traces, and retain the correlation ID.
  Secret scanning and production dependency audit report no unaccepted high or
  critical finding.

### Observability and operations

- **M9-AC-013:** Liveness performs no dependency work. Readiness reports only
  an aggregate state and checks every currently required serving dependency
  with a bounded timeout.
- **M9-AC-014:** A protected, machine-readable metrics surface exposes request
  count/error/latency, in-flight requests, readiness, OTP dispatch outcomes,
  payment callback verification/reconciliation, refund outcomes, job state and
  reservation-expiry lag using bounded labels. It contains no business IDs or
  personal data.
- **M9-AC-015:** Structured operational events share correlation IDs across
  requests and jobs, use stable event/outcome names, and are distinct from the
  immutable business audit history.
- **M9-AC-016:** Alert specifications include signal, threshold/window,
  severity, owner, immediate checks, escalation and recovery condition for
  elevated HTTP errors/latency, database unready state, OTP failure/limiting,
  unverified callbacks, reconciliation age/backlog, failed/exhausted jobs,
  reservation lag, refund failure and storage error.
- **M9-AC-017:** Operator procedures support diagnosis by correlation ID without
  exposing or requiring a secret, raw callback or customer PII.

### Performance and capacity

- **M9-AC-018:** A repeatable synthetic load harness targets production builds
  and synthetic data only. It records runtime/host, concurrency, duration,
  throughput, error rate and p50/p95/p99 latency for health, catalog/search,
  OTP-limit, authenticated checkout read/write and callback replay profiles as
  applicable.
- **M9-AC-019:** The initial API service objective for the agreed local profile
  is less than 1% unexpected errors, p95 below 500 ms for cached/read-only
  catalog requests and p95 below 1,000 ms for representative transactional
  requests. A measured miss is a finding to resolve or explicitly block; the
  threshold is not a production capacity promise.
- **M9-AC-020:** Browser evidence on production builds measures the established
  Homepage, Catalog, Product, Cart and Checkout journey at 390x844, 768x1024,
  1280x800 and 1440x900. It preserves no horizontal overflow, LCP at or below
  2.5 seconds, CLS at or below 0.1, INP at or below 200 ms when observable, and
  zero critical accessibility violation on the agreed local profile.
- **M9-AC-021:** Any bottleneck change is supported by before/after measurement
  and does not introduce Redis, a queue, dedicated search, microservices or a
  separate read database without measured need and an accepted ADR.

### Recovery, migration and rollback

- **M9-AC-022:** The complete migration chain applies to an empty isolated
  PostgreSQL 16 database and to a restored Milestone 8-shaped database. Schema
  status, invariant probes and elapsed time are recorded; no destructive
  production migration is run.
- **M9-AC-023:** A logical PostgreSQL backup of the synthetic rehearsal database
  restores into a distinct isolated database. Counts and commercial invariants
  are verified and backup/restore durations plus artifact checksum are
  recorded. The rehearsal artifact contains no production or personal data.
- **M9-AC-024:** Provider outage rehearsal proves bounded timeout, safe failure,
  no invented payment/refund/SMS success, no negative inventory and an
  observable pending/reconciliation path where required.
- **M9-AC-025:** Application rollback rehearsal returns API/storefront/admin to
  the reviewed Milestone 8 commit while retaining additive schema and immutable
  facts. Payment callback ingestion/reconciliation remains available, unsafe
  mutations are disabled when required, and no migration is reversed after a
  commercial fact exists.
- **M9-AC-026:** Recovery success is declared only after readiness, smoke,
  invariant and correlated-event checks pass. Business RPO/RTO remain a launch
  blocker until approved; measured rehearsal timings are observations, not
  commitments.

### End-to-end and release evidence

- **M9-AC-027:** Production-build Playwright verifies a representative customer
  browse -> Cart -> OTP -> Checkout -> payment result -> Order path and an
  administration publish/inventory -> fulfillment -> return/refund -> audit
  path using only guarded synthetic fixtures and Fake adapters.
- **M9-AC-028:** Browser acceptance also verifies security headers, cookie
  flags, CSRF rejection, cross-owner/role denial, callback replay and a
  dependency/provider-outage failure state. A Fake-provider pass is local
  orchestration evidence, not provider sandbox certification.
- **M9-AC-029:** Format, lint, strict type-check, unit, PostgreSQL integration,
  architecture, OpenAPI, contract, production build, E2E, dependency audit and
  secret scan gates pass. Security, load and recovery commands have retained
  non-secret evidence.
- **M9-AC-030:** Traceability, security model, environment reference, deployment
  runbook and rollback notes identify implemented behavior, measured results,
  blockers and exact operator action. No deployment, credential rotation, paid
  tier change, destructive production operation, push or merge occurs.

## Threat and failure matrix

| Threat or failure                           | Required safe outcome                                                                               | Evidence                                        |
| ------------------------------------------- | --------------------------------------------------------------------------------------------------- | ----------------------------------------------- |
| Fake provider selected in production        | Startup aborts before listening; no value is logged.                                                | Configuration unit/launch test                  |
| Forged, stale or oversized payment callback | Stable rejection before receipt, Order or inventory mutation; safe security metric.                 | Unit and PostgreSQL integration tests           |
| Exact callback replay in parallel           | One commercial result and one stock effect; replay result stable.                                   | Existing and extended concurrency tests         |
| Altered event/transaction replay            | Conflict/reconciliation according to provider-neutral policy; immutable original fact retained.     | Integration tests                               |
| SMS timeout or rejection                    | Generic customer response, no plaintext OTP, bounded retry behavior, safe outcome metric.           | Adapter contract and identity integration tests |
| OTP enumeration/brute force/flood           | Identical public shape, cooldown/daily limits and hashed risk keys; bounded metric labels.          | Abuse/load profile                              |
| Session theft/fixation or CSRF              | Rotation/revocation or 401/403; no state change.                                                    | Integration and Playwright negative journey     |
| Cross-customer or lower-role access         | 404/403 as appropriate; no target data or mutation.                                                 | Access-control matrix                           |
| Malicious Media URL/format/metadata         | Rejected before persistence or fetch; no SVG/executable content.                                    | Boundary tests                                  |
| Database unavailable/slow                   | Readiness fails, liveness remains up, request timeout/error is correlated, alert condition fires.   | Failure rehearsal                               |
| Payment/refund provider unavailable         | No success claim; safe retry/reconciliation state and operator signal.                              | Fake fault injection                            |
| SMS provider unavailable                    | No delivery claim; challenge semantics remain safe and observable.                                  | Fake fault injection                            |
| Monitoring sink unavailable                 | Business request correctness is preserved; bounded local event path does not recurse or leak.       | Unit/failure test                               |
| Storage unavailable                         | No successful upload/registration claim; existing media reads fail safely or retain known metadata. | Storage-neutral rehearsal                       |
| Job lease expires or handler retries        | Idempotent recovery, bounded attempts, visible age/count.                                           | PostgreSQL job tests                            |
| Backup corrupt/incomplete                   | Checksum/invariant verification fails and recovery is not declared.                                 | Restore rehearsal negative probe                |
| Rollback after new facts                    | Additive schema and immutable facts retained; unsafe older mutation paths remain disabled.          | Rollback checklist/rehearsal                    |

## Load profiles

| Profile           | Synthetic workload                                                                     | Primary observations                                                       |
| ----------------- | -------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| `public-read`     | Homepage, catalog list/search, Product detail at staged concurrency                    | throughput, p50/p95/p99, errors, DB saturation                             |
| `identity-abuse`  | Unique and repeated OTP challenge/verification attempts below and above policy limits  | accepted/limited ratio, latency, bounded persistence and labels            |
| `checkout-write`  | Independent authenticated synthetic carts entering Checkout with non-conflicting stock | transaction latency, lock waits, error rate, inventory invariants          |
| `callback-replay` | Exact and altered Fake callback events, including parallel replay                      | verification latency, one-Order invariant, rejection/reconciliation counts |
| `operator-read`   | Authorized Order/audit queries with bounded filters                                    | p95/p99, query plan/connection pressure, result bounds                     |

Every run uses an isolated `kele_e2e`/rehearsal database and fixed synthetic
fixtures. The harness stops if a normal development or production database is
selected.

## Rollback boundary

Milestone 9 hardening must be backward-compatible with the Milestone 8
application wherever practical. Rollback selects immutable application
artifacts; it does not reverse additive schema after new writes. Callback and
reconciliation ingestion remain reachable, immutable payment/refund/order/
inventory/audit facts remain intact, and operators reconcile from provider
truth after the relevant provider is approved. Provider adapters are selected
only through validated configuration; disabling one never authorizes switching
to a Fake adapter in production.

## Exit decision

Engineering hardening may reach `CONDITIONAL GO` with all independent criteria
passing. ADR-0005 closes OQ-002-PROD, OQ-003-PROD, OQ-017, OQ-018 and OQ-022,
but Milestone 9 cannot claim its roadmap provider-integration exit and no
staging/production deployment may proceed while required provider, regional
infrastructure, administrator-recovery or managed-database certification is
absent.
