# Milestone 9 verification record

Version: 0.1

Evidence date: 2026-08-06 (`Asia/Tehran`)

Branch: `feat/m09-production-hardening`

Baseline: reviewed local `main` at `60b6251`

Decision: **CONDITIONAL GO for provider-independent engineering hardening;
NO-GO for staging and production.** No production provider, credential, paid
tier, deployment or destructive production operation was selected or changed.

## Provider decision and certification gate

| Decision      | Verified answer                                                                                       | Certification result                                                                              |
| ------------- | ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `OQ-002-PROD` | Open; no Payment/Refund provider or protocol is approved.                                             | Blocked. Fake adapters prove local orchestration only.                                            |
| `OQ-003-PROD` | Open; no SMS provider or delivery contract is approved.                                               | Blocked. Fake delivery proves local orchestration only.                                           |
| `OQ-017`      | Open; no error-monitoring provider, region, retention, sampling or alert destination is approved.     | Blocked. Safe local structured events and metrics are implemented; no remote export is claimed.   |
| `OQ-018`      | Open; no production object storage/CDN, region, signing model or lifecycle is approved.               | Blocked. MinIO remains local-only; URL/metadata hardening is certified, binary upload/CDN is not. |
| `OQ-022`      | Open; no production administration identity/session provisioning and revocation contract is approved. | Blocked. Static role tokens are rejected by production configuration.                             |

The provider-neutral Payment, Refund and SMS ports now expose provider identity
without leaking an SDK type. Production configuration fails closed for every
Fake/local adapter. Provider outage tests prove that intent, refund and SMS
failures cannot be reported as successful and emit only bounded safe outcomes.
No provider-specific adapter, schema, credential name or sandbox claim was
invented.

## Verified gates

| Gate                   | Result and evidence                                                                                                                                                                                                                                                                              |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Format                 | Passed: full Prettier check.                                                                                                                                                                                                                                                                     |
| Lint                   | Passed: full ESLint workspace gate.                                                                                                                                                                                                                                                              |
| Strict type-check      | Passed: seven TypeScript projects.                                                                                                                                                                                                                                                               |
| Unit                   | Passed: 17 files, 112 tests, including redaction, headers, rate limits, metrics authorization and media validation.                                                                                                                                                                              |
| Architecture           | Passed: inward dependency and module ownership tests.                                                                                                                                                                                                                                            |
| OpenAPI                | Passed: Redocly validation; 55 pre-existing style warnings ignored by the established command. Generated client contract had no drift.                                                                                                                                                           |
| Contract               | Passed: 1 file, 2 tests.                                                                                                                                                                                                                                                                         |
| PostgreSQL integration | Passed: 7 files, 45 tests; 14 migrations applied with no pending migration. Outage, replay, idempotency and inventory invariants are covered.                                                                                                                                                    |
| Production builds      | Passed for API, Storefront and Administration during the full browser gate.                                                                                                                                                                                                                      |
| Browser acceptance     | Passed on production builds: 42/42 Playwright journeys in 2.3 minutes. The new M9 security/performance suite passed 3/3. One legacy journal navigation was transiently absent in an earlier run, passed immediately in isolation (1/1), then passed in the final full run without a code change. |
| Dependency posture     | Passed: `pnpm audit --prod --audit-level=high` reported no known vulnerability.                                                                                                                                                                                                                  |
| Secret posture         | Passed: local tracked-file policy reported no match after a test-fixture false positive was renamed; no secret value was emitted or retained. CI retains Gitleaks.                                                                                                                               |

The repository still has no release image definition, so a deployable container
image scan could not be executed. Creating a production image and scanning its
OS/application layers remains a release-candidate infrastructure blocker; this
record does not substitute dependency and source scans for an image scan.

## Security findings and resolution

| Finding                                                                                                             | Resolution                                                                                                                                                                                                                                          |
| ------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Production API artifact omitted its direct Express runtime dependency.                                              | Added the direct pinned workspace dependency; production API startup is exercised by Playwright.                                                                                                                                                    |
| Readiness and metrics guards had primitive constructor values that Nest could not resolve in a production artifact. | Replaced implicit primitive injection with explicit module wiring and bounded health configuration; production startup and protected metrics pass.                                                                                                  |
| Oversized JSON was being translated to a 500 response.                                                              | Disabled implicit parsing, installed explicit bounded parsers and mapped parse/size failures to safe 400/413 problem responses.                                                                                                                     |
| Logs could retain nested secrets, authorization values, mobile numbers or credential-bearing URLs.                  | Added recursive bounded redaction, keyed and value-pattern scrubbing and regression tests.                                                                                                                                                          |
| OTP verification and callback endpoints lacked process-local abuse bounds.                                          | Added privacy-preserving HMAC-keyed fixed-window guards, bounded key storage, stable 429 responses and safe metrics. The limits are per process; horizontal aggregate limiting needs a measured need and accepted ADR before adding infrastructure. |
| Media registration admitted unsafe remote or executable references.                                                 | Restricted references to immutable same-origin raster paths and bounded dimensions/pixels/alt text; SVG and remote URLs are rejected.                                                                                                               |
| API and web responses lacked a complete explicit header policy.                                                     | Added CSP, frame, content-type, referrer, permissions, opener/resource and production transport policies plus exact-origin CORS.                                                                                                                    |
| Static administration credentials could be selected for production.                                                 | Production configuration now rejects `development_static`; final production identity remains blocked by `OQ-022`.                                                                                                                                   |

No unresolved high or critical dependency finding was observed. Residual risks
and provider blocks are recorded in `docs/security.md` and
`docs/open-questions.md`.

## Observability and alert readiness

The API now supplies correlated structured events and bounded Prometheus text
metrics for HTTP count/error/latency/in-flight work, readiness, OTP dispatch,
Payment callback/provider outcomes, Refund outcomes, jobs, reconciliation and
reservation expiry. `/api/v1/metrics` is bearer protected, constant-time
compared, unavailable without a configured token and documented in OpenAPI.
Labels contain no customer, Order, callback or provider transaction identifier.

The deployment runbook assigns threshold, window, severity, owner, diagnostic
checks, escalation and recovery condition for HTTP errors/latency, readiness,
OTP, callback verification, reconciliation, jobs, reservation lag, Refund and
storage signals. Remote error export and a real alert destination remain blocked
by `OQ-017`.

## Capacity observation

The repeatable harness ran against production API/web builds, guarded synthetic
`kele_e2e` data, Node.js 24.18 on Windows x64, Intel Core Ultra 5 225H (14
logical CPUs) and 33.75 GB memory. Each profile used concurrency 16 for five
seconds.

| Profile         | Requests |    Throughput | Unexpected errors |   p50 |   p95 |   p99 |    Max |
| --------------- | -------: | ------------: | ----------------: | ----: | ----: | ----: | -----: |
| `public-read`   |    5,919 | 1,183.8 req/s |                 0 | 13 ms | 20 ms | 24 ms | 110 ms |
| `operator-read` |   14,024 | 2,804.8 req/s |                 0 |  5 ms | 10 ms | 13 ms |  52 ms |

Both profiles cleared the local `<1%` unexpected-error and `<500 ms` read p95
thresholds. This is a single-host engineering observation, not a production
capacity promise. No measured need justified Redis, a queue, dedicated search,
microservices or a read replica. The harness currently automates read profiles;
transactional OTP/checkout/callback concurrency remains covered by integration
tests and should be added to staging load certification after providers and
capacity targets are approved.

## Migration, backup, restore and outage evidence

The guarded recovery rehearsal used only loopback PostgreSQL and databases
named `kele_e2e`, `kele_m9_empty` and `kele_m9_restore`.

| Observation                          |                                                             Result |
| ------------------------------------ | -----------------------------------------------------------------: |
| Empty-database migration chain       |                                                           1,412 ms |
| Versioned application logical backup |                                                             118 ms |
| Restore transaction                  |                                                             170 ms |
| Migration verification after restore |                                                           1,366 ms |
| Backup artifact                      |                                                       36,107 bytes |
| Artifact SHA-256                     | `896b13fc79897e93d13521b50de8660afa0eb6c073b6ab0897015c87d457ddb2` |

Source and restored databases each contained 14 migrations, 3 inventory rows
and 2 business-event rows; counts matched, invalid inventory was zero and no
Order without verified Payment was found. The source fixture contained no
commercial Order, so historical Order preservation is additionally proven by
the PostgreSQL integration suite, not this backup sample. The application
logical artifact is rehearsal evidence only; approved encrypted managed backup,
PITR, retention, access controls and business RPO/RTO remain launch blockers.

Fault injection verified Payment-intent outage leaves no PaymentAttempt or
inventory mutation, SMS outage consumes the challenge without a delivery claim,
and Refund outage remains safely retryable. Callback replay/reconciliation,
expired reservation recovery and immutable facts pass the integration suite.

## Rollback rehearsal

A clean detached worktree at reviewed Milestone 8 commit `60b6251` was built
offline for API, Storefront and Administration, migrated against the isolated
synthetic database, and exercised with a production Playwright smoke. Readiness,
unsupported callback rejection and `fa-IR`/RTL web shells passed 1/1 in 3.4
seconds; the complete runner took 32.4 seconds. No migration was reversed and
Milestone 9 adds no schema migration, so rollback retains the existing additive
schema and immutable facts. The temporary worktree and an empty failed dump
artifact were removed after exact path validation; they contained no user data
and are not recoverable.

Monitor-ready rollback triggers and recovery thresholds are in
`docs/deployment-runbook.md`. Operators must stop unsafe writes, keep callback
ingestion/reconciliation available, select the immutable M8 artifact, retain
all additive schema/facts, and roll forward if the older application cannot
interpret current state. Readiness, error/latency, inventory, callback,
reconciliation and refund signals must remain below recovery thresholds for ten
minutes before traffic is restored.

## Remaining blockers

1. Approve and record `OQ-002-PROD`, `OQ-003-PROD`, `OQ-017`, `OQ-018` and
   `OQ-022`, then implement and certify only those approved adapters/contracts.
2. Run provider sandbox certification for Payment, Refund and SMS, and certify
   object-storage/CDN and error-monitoring retention/scrubbing in the approved
   region.
3. Approve production administration identity provisioning, role lifecycle,
   revocation and recovery; execute lower-role browser acceptance.
4. Approve business RPO/RTO and production backup/PITR/retention policy; rehearse
   them with the selected managed PostgreSQL service.
5. Define and scan the deployable application images before release candidate.
6. Resolve the production design/rights blockers `DES-001` through `DES-005`
   before customer-facing release.

Until these are closed, staging/production is `NO-GO`; rollback preparation is
monitor-ready but no deployment, push or merge has occurred.
