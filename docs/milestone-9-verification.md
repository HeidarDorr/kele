# Milestone 9 verification record

Version: 0.2

Evidence date: 2026-08-07 (`Asia/Tehran`)

Branch: `feat/m09-production-hardening`

Baseline: reviewed local `main` at `60b6251`

Decision: **CONDITIONAL GO for provider-independent engineering hardening;
NO-GO for staging and production.** No production provider, credential, paid
tier, deployment or destructive production operation was selected or changed.

## Execution identity

| Observation                 | Recorded value                                                                |
| --------------------------- | ----------------------------------------------------------------------------- |
| Runtime                     | Node.js 24.18.0; pnpm 11.18.0                                                 |
| Database                    | PostgreSQL 16.14, Visual C++ 1944, 64-bit                                     |
| Migration/integration run   | 2026-08-07 12:07:38 `Asia/Tehran`; 14 migrations, none pending; 25.34 seconds |
| Focused load interval       | 2026-08-07T08:08:09.169Z to 2026-08-07T08:08:27.478Z                          |
| Recovery evidence completed | 2026-08-07T08:09:02.859Z                                                      |
| Final browser evidence      | 2026-08-07T08:30:01.167Z; production builds                                   |

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

| Gate                   | Result and evidence                                                                                                                                                                                                                                                             |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Format                 | Passed: full Prettier check.                                                                                                                                                                                                                                                    |
| Lint                   | Passed: full ESLint workspace gate.                                                                                                                                                                                                                                             |
| Strict type-check      | Passed: seven TypeScript projects.                                                                                                                                                                                                                                              |
| Unit                   | Passed: 17 files, 112 tests, including redaction, headers, rate limits, metrics authorization and media validation.                                                                                                                                                             |
| Architecture           | Passed: inward dependency and module ownership tests.                                                                                                                                                                                                                           |
| OpenAPI                | Passed: Redocly validation; 55 pre-existing style warnings ignored by the established command. Generated client contract had no drift.                                                                                                                                          |
| Contract               | Passed: 1 file, 2 tests.                                                                                                                                                                                                                                                        |
| PostgreSQL integration | Passed afresh on PostgreSQL 16.14: 7 files, 45 tests in 25.34 seconds; 14 migrations applied with no pending migration. Outage, replay, idempotency, 16-way contention and inventory invariants are covered.                                                                    |
| Production builds      | Passed for API, Storefront and Administration during the full browser gate.                                                                                                                                                                                                     |
| Browser acceptance     | Passed on production builds: the complete 42-journey state/accessibility/security matrix in 3.4 minutes and the focused M9 suite (3/3). The focused suite additionally recorded Storefront/Admin smoke at 390x844, 768x1024, 1280x800 and 1440x900 with no horizontal overflow. |
| Dependency posture     | Passed: the workspace override resolves the affected transitive chain to `js-yaml@4.3.1`; `pnpm why js-yaml` confirms `openapi-typescript -> @redocly/openapi-core -> js-yaml 4.3.1`, and `pnpm audit --prod --audit-level=high` reports no known vulnerability.                |
| Secret posture         | Passed: local tracked-file policy reported no match after a test-fixture false positive was renamed; no secret value was emitted or retained. CI retains Gitleaks.                                                                                                              |

The final four-viewport production-build observation was:

| Viewport                | Storefront CLS | Storefront LCP | DOM ready | Storefront overflow | Admin overflow |
| ----------------------- | -------------: | -------------: | --------: | ------------------: | -------------: |
| Mobile `390x844`        |              0 |         152 ms |    113 ms |                none |           none |
| Tablet `768x1024`       |              0 |          56 ms |     35 ms |                none |           none |
| Small laptop `1280x800` |              0 |          60 ms |     35 ms |                none |           none |
| Desktop `1440x900`      |              0 |          56 ms |     32 ms |                none |           none |

INP is explicitly recorded as unobserved because the smoke navigation has no
qualifying interaction; the complete suite separately exercises keyboard,
focus, loading, empty, error, disabled, unavailable and success states. No INP
claim is inferred from navigation timings.

The repository still has no release image definition, so a deployable container
image scan could not be executed. Creating a production image and scanning its
OS/application layers remains a release-candidate infrastructure blocker; this
record does not substitute dependency and source scans for an image scan.

## Findings and resolution

| Finding                                                                                                                              | Resolution                                                                                                                                                                                                                                          |
| ------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Production API artifact omitted its direct Express runtime dependency.                                                               | Added the direct pinned workspace dependency; production API startup is exercised by Playwright.                                                                                                                                                    |
| Readiness and metrics guards had primitive constructor values that Nest could not resolve in a production artifact.                  | Replaced implicit primitive injection with explicit module wiring and bounded health configuration; production startup and protected metrics pass.                                                                                                  |
| Oversized JSON was being translated to a 500 response.                                                                               | Disabled implicit parsing, installed explicit bounded parsers and mapped parse/size failures to safe 400/413 problem responses.                                                                                                                     |
| Logs could retain nested secrets, authorization values, mobile numbers or credential-bearing URLs.                                   | Added recursive bounded redaction, keyed and value-pattern scrubbing and regression tests.                                                                                                                                                          |
| OTP verification and callback endpoints lacked process-local abuse bounds.                                                           | Added privacy-preserving HMAC-keyed fixed-window guards, bounded key storage, stable 429 responses and safe metrics. The limits are per process; horizontal aggregate limiting needs a measured need and accepted ADR before adding infrastructure. |
| Media registration admitted unsafe remote or executable references.                                                                  | Restricted references to immutable same-origin raster paths and bounded dimensions/pixels/alt text; SVG and remote URLs are rejected.                                                                                                               |
| API and web responses lacked a complete explicit header policy.                                                                      | Added CSP, frame, content-type, referrer, permissions, opener/resource and production transport policies plus exact-origin CORS.                                                                                                                    |
| Static administration credentials could be selected for production.                                                                  | Production configuration now rejects `development_static`; final production identity remains blocked by `OQ-022`.                                                                                                                                   |
| Independent integration contention exceeded Prisma's implicit two-second transaction-acquisition default.                            | Interactive transactions now have explicit five-second acquisition and ten-second execution bounds; the integration runner allows fifteen seconds and the complete 45-test suite passes under intentional 16-way contention.                        |
| OTP verification transport drifted from the OpenAPI 200/400 contract to Nest's default 201/422 responses.                            | The controller now explicitly returns 200 on success and OTP verification failures use a 400-class application error; the `identity-abuse` HTTP profile observes only expected 202/400/429 outcomes.                                                |
| The transitive OpenAPI toolchain resolved vulnerable `js-yaml@4.3.0`.                                                                | A workspace override pins `js-yaml@4.3.1`, the lockfile was regenerated, the dependency path was inspected and the production audit now reports no known vulnerability.                                                                             |
| Journal evidence submitted while Next.js route prefetches were still active, intermittently losing the same-route notice transition. | The production-browser test now waits for the finite preload set to settle before submit; the journey passed three consecutive isolated runs and the final complete suite.                                                                          |
| Route-integrity evidence counted a live link locator while hydration changed that collection.                                        | Link references are now captured atomically in one DOM evaluation; the isolated route test and final complete suite pass without retry.                                                                                                             |
| The local secret scanner claimed a tracked-file policy but recursively entered ignored/untracked runtime directories.                | The scanner now obtains its exact NUL-delimited file set from the Git index with a repository-scoped safe-directory argument; the final tracked-file scan reports no match.                                                                         |

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
`kele_e2e` data, Node.js 24.18.0 on Windows x64, Intel Core Ultra 5 225H (14
logical CPUs) and 33.75 GB memory. Each profile used concurrency 16. Read
profiles ran for five seconds; abuse and transactional profiles used bounded
finite workloads.

| Profile           | Requests |    Throughput | Unexpected errors |    p50 |    p95 |    p99 |    Max |
| ----------------- | -------: | ------------: | ----------------: | -----: | -----: | -----: | -----: |
| `public-read`     |    9,159 | 1,831.8 req/s |                 0 |   9 ms |  14 ms |  17 ms |  23 ms |
| `identity-abuse`  |       96 |    69.2 req/s |                 0 | 200 ms | 377 ms | 486 ms | 486 ms |
| `checkout-write`  |       16 |    60.5 req/s |                 0 | 170 ms | 263 ms | 263 ms | 263 ms |
| `callback-replay` |       16 |   733.5 req/s |                 0 |  19 ms |  21 ms |  21 ms |  21 ms |
| `operator-read`   |   12,514 | 2,502.8 req/s |                 0 |   6 ms |  10 ms |  12 ms |  27 ms |

All five profiles cleared the local `<1%` unexpected-error threshold, the read
profiles cleared the `<500 ms` p95 target and the abuse/transactional profiles
cleared the `<1,000 ms` p95 target. The OTP profile observed 4 accepted, 44
invalid-verification rejections and 48 rate-limited responses. Sixteen Checkouts
produced exactly sixteen active reservations. Parallel callback replay produced
one Order and one receipt, rejected all eight altered replays, retained physical
quantity 19 and reserved quantity 15, and found no invalid inventory. This is a
single-host engineering observation, not a production capacity promise. No
measured need justified Redis, a queue, dedicated search, microservices or a
read replica.

## Migration, backup, restore and outage evidence

The guarded recovery rehearsal used only loopback PostgreSQL and databases
named `kele_e2e`, `kele_m9_empty` and `kele_m9_restore`.

| Observation                          |                                                             Result |
| ------------------------------------ | -----------------------------------------------------------------: |
| Empty-database migration chain       |                                                           5,667 ms |
| Versioned application logical backup |                                                           2,104 ms |
| Restore transaction                  |                                                           2,132 ms |
| Migration verification after restore |                                                           5,549 ms |
| Backup artifact                      |                                                      199,996 bytes |
| Artifact SHA-256                     | `02ec4f03cec706102a5a500ed1dbe090648835332013446102ab086d01eb55dd` |

Source and restored databases each contained 14 migrations, 16 customers, one
verified-payment Order, one PaymentAttempt, 3 inventory rows and 37 business
events. Counts matched, invalid inventory was zero and no Order without verified
Payment was found. The empty migration target retained 14 migrations and zero
business rows. The application logical artifact is rehearsal evidence only;
approved encrypted managed backup, PITR, retention, access controls and business
RPO/RTO remain launch blockers.

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
