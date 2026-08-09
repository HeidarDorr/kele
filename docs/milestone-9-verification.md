# Milestone 9 verification record

Version: 0.5

Evidence date: 2026-08-08 (`Asia/Tehran`)

Branch: `feat/m09-production-hardening`

Baseline: reviewed local `main` at `60b6251`

Release-image candidate: `fd168f943b973e129b2961786aeef84e7675ca42`

Decision: **GO for the local provider-bound engineering and release-image
gates; NO-GO for staging and production.** ADR-0005 resolves the five production
technology decisions and their adapters are implemented. Real provider,
regional infrastructure, managed recovery and remote CI certifications remain
mandatory and have not been represented as passing.

No production credential, tenant, paid tier, deployment, push or merge was
created by this verification.

An external-access preflight was repeated at
2026-08-08T12:53:54+03:30 against reviewed commit `d066e5b`. Required
Vandar/Kavenegar credentials were absent, Arvan exposed only an unauthenticated
login, no regional observability or managed PostgreSQL control plane was
configured, no real administrator factor/two-person identities existed, and the
repository still had no remote. These redacted `BLOCKED` observations are
recorded in `docs/m9-production-approval-record.md`; they are not certification
results.

## Execution identity

| Observation              | Recorded value                                                                                                  |
| ------------------------ | --------------------------------------------------------------------------------------------------------------- |
| Runtime                  | Node.js 24.18.0; pnpm 11.18.0                                                                                   |
| Database                 | PostgreSQL 16.14 on loopback; 16 migrations, none pending                                                       |
| Integration              | 2026-08-08 12:25 `Asia/Tehran`; 8 files, 50/50 tests                                                            |
| Browser                  | Chrome 151.0.7922.108; completed 2026-08-08T09:02:58.041Z; 42/42 tests in 4 files                               |
| Load                     | 2026-08-08T09:02:58.636Z through 2026-08-08T09:03:13.892Z                                                       |
| Recovery                 | completed 2026-08-08T09:03:34.270Z                                                                              |
| Container engine/scanner | Docker Engine 29.6.1; Trivy 0.69.3                                                                              |
| Scanner image            | `aquasec/trivy:0.69.3`; pulled digest `sha256:bcc376de8d77cfe086a917230e818dc9f8528e3c852f7b1aff648949b6258d1c` |

## Production decisions and certification boundary

| Decision      | Approved and implemented boundary                                                                                          | Certification state                                                                                                                                      |
| ------------- | -------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `OQ-002-PROD` | Vandar IPG v3 and Refund v3 behind provider-neutral ports; exact IRR verification, bounded calls and explicit refund retry | Pending real merchant IPG/Refund account, credentials and sandbox evidence. `CERT-M9-001` separately blocks refund completion.                           |
| `OQ-003-PROD` | Kavenegar REST v1 Verify Lookup plus bounded delivery-status lookup                                                        | Pending real account/API key, approved `KeleOtp` template, sender and delivery evidence.                                                                 |
| `OQ-017`      | KELE-managed Grafana/Loki/Prometheus inside Iran; redacted logs and protected Prometheus metrics                           | Pending private cluster, regional ingestion, retention, on-call delivery and acknowledgement evidence.                                                   |
| `OQ-018`      | Private Arvan Simin S3-compatible storage/CDN boundary with short-lived signed URLs                                        | Pending real bucket/CDN, encryption/versioning/lifecycle, anonymous-denial, invalidation, malware and access-log evidence.                               |
| `OQ-022`      | PostgreSQL administrator principals, Kavenegar OTP and opaque revocable sessions                                           | Local database/session/login behavior passes; production bootstrap, two-person break-glass, real SMS factor and role-lifecycle rehearsal remain pending. |

Production configuration fails closed for Fake/local providers and static
administrator credentials. Provider SDK, Prisma, HTTP and storage SDK types do
not leak into domain/application contracts.

The Vandar Refund adapter deliberately persists a submitted request as
`pending`, even if the initial response claims completion. The published Refund
v3 contract documents an asynchronous `notify_url` payload but no callback
signature, shared secret or authenticated status-inquiry contract. Accepting
that payload as authoritative would violate KELE's authenticated, replay-safe
callback rule. `CERT-M9-001` therefore requires provider-backed evidence or an
accepted ADR addendum before Vandar can confirm a Refund.

## Verified gates

| Gate                         | Fresh result                                                                                                                                                                                        |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Format                       | Passed: full Prettier check.                                                                                                                                                                        |
| Lint                         | Passed: full ESLint workspace gate after regenerating Prisma Client from the current schema.                                                                                                        |
| Strict type-check            | Passed: seven TypeScript projects.                                                                                                                                                                  |
| Unit                         | Passed: 18 files, 124/124 tests.                                                                                                                                                                    |
| Architecture                 | Passed: inward dependency and module-ownership checks.                                                                                                                                              |
| OpenAPI                      | Passed: Redocly validation; the established command reports 55 explicitly ignored style observations. Generated client contract has no drift.                                                       |
| Contract                     | Passed: 1 file, 2/2 tests.                                                                                                                                                                          |
| PostgreSQL integration       | Passed on PostgreSQL 16.14: 8 files, 50/50 tests; 16 migrations and none pending. Administrator challenge/session/revocation, callbacks, refunds, concurrency and inventory invariants are covered. |
| Production builds            | Passed for API, Storefront and Administration.                                                                                                                                                      |
| Browser acceptance           | Passed on production builds with installed Chrome: 42/42 journeys in 4 files, including focused M9 operational acceptance.                                                                          |
| Load                         | Passed: all five profiles met their local thresholds with `unexpected=0`; transactional invariants passed.                                                                                          |
| Local recovery               | Passed: guarded empty migration, logical backup, restore and post-restore migration/invariant verification.                                                                                         |
| Dependency audit             | Passed: `pnpm audit --prod --audit-level=high` reports no known vulnerability. `js-yaml` is 4.3.1 and `nanoid` is 3.3.17.                                                                           |
| Secret posture               | Passed: tracked-file scanner reports no match; test fixtures are constructed without assigned secret-like literals. CI retains Gitleaks.                                                            |
| Runtime smoke                | Passed: API liveness, Storefront icon and Administration icon returned HTTP 200 from the three final images; each ran as `65532:65532`.                                                             |
| Local release-image scan     | Passed: all three final images have zero High and zero Critical findings.                                                                                                                           |
| Remote CI release-image scan | **Not run.** This checkout has no Git remote or authenticated GitHub execution path. A retained CI run for the reviewed remote commit is still a release blocker.                                   |

## Browser and responsive evidence

The runner auto-detected system Chrome and did not download Playwright Headless
Shell. The machine-readable artifact records `fa-IR`, RTL, production builds and
the following final observations:

| Viewport                | Storefront CLS | Storefront LCP | DOM ready | Storefront overflow | Admin overflow | Admin login overflow |
| ----------------------- | -------------: | -------------: | --------: | ------------------- | -------------- | -------------------- |
| Mobile `390x844`        |              0 |         156 ms |    109 ms | none                | none           | none                 |
| Tablet `768x1024`       |              0 |         452 ms |     51 ms | none                | none           | none                 |
| Small laptop `1280x800` |              0 |          68 ms |     35 ms | none                | none           | none                 |
| Desktop `1440x900`      |              0 |          68 ms |     35 ms | none                | none           | none                 |

INP is explicitly unobserved because the smoke navigation has no qualifying
interaction. No INP result is inferred from navigation timings. The complete
suite separately exercises keyboard, focus, loading, empty, error, disabled,
unavailable and success states.

## Capacity observation

The repeatable harness ran against production API/web builds and guarded
synthetic `kele_e2e` data on Windows x64, Intel Core Ultra 5 225H, 14 logical
CPUs and 33.75 GB memory. Concurrency was 16.

| Profile           | Requests |    Throughput | Unexpected |    p50 |    p95 |    p99 |    Max |
| ----------------- | -------: | ------------: | ---------: | -----: | -----: | -----: | -----: |
| `public-read`     |    8,407 | 1,681.4 req/s |          0 |   9 ms |  16 ms |  28 ms |  53 ms |
| `identity-abuse`  |       96 |    45.1 req/s |          0 | 319 ms | 601 ms | 757 ms | 757 ms |
| `checkout-write`  |       16 |    43.8 req/s |          0 | 213 ms | 362 ms | 362 ms | 362 ms |
| `callback-replay` |       16 | 1,102.4 req/s |          0 |  12 ms |  13 ms |  13 ms |  13 ms |
| `operator-read`   |   11,889 | 2,377.8 req/s |          0 |   6 ms |  13 ms |  24 ms |  37 ms |

The identity profile observed 4 accepted, 44 rejected and 48 rate-limited
requests. Sixteen Checkouts produced exactly sixteen active reservations.
Callback replay produced one Order and one receipt, accepted eight exact
replays, rejected eight altered replays, retained physical quantity 19 and
reserved quantity 15, and found no invalid inventory. This is a single-host
engineering observation, not a production capacity promise. It does not justify
Redis, a queue, dedicated search, microservices or a read replica.

## Release images and vulnerability evidence

The build stage remains pinned to Node.js 24.18.0. Runtime stages use the pinned
distroless Debian 12 CC base at
`sha256:fccdbb0a547c14e23fcf4ce8ad62ca5d43b4faae8d22cd292f490fef9946c96e`
and copy that exact Node binary. The images contain no shell/package manager,
run as UID/GID `65532:65532`, use absolute Node entrypoints and carry the exact
`fd168f9` revision label.

| Image      | Local image ID                                                            |        Size | High | Critical | Report bytes | Report SHA-256                                                     |
| ---------- | ------------------------------------------------------------------------- | ----------: | ---: | -------: | -----------: | ------------------------------------------------------------------ |
| API        | `sha256:cd3095426cb7e1d3194b3058a5e84538a66f09a379c655f8619dcbbb41dc6027` | 172,802,455 |    0 |        0 |      216,732 | `709c1e978db361c98e3c2fd37fdfee0dc875cb86e9d92e06dcb35bdca439c1b5` |
| Storefront | `sha256:b5b9a8a6c42b7760b159a7568a0b63581e6419ed586348ec738f6dafc69e934c` | 164,262,820 |    0 |        0 |      122,665 | `cb879439f4b7b6cc41089c57923945e95e8a9c02f6b9706d8558759de976debc` |
| Admin      | `sha256:c906f5e1229d480a9d938dd7a17f5101faef7ab66fe7c30650d31e2f1f27d4e1` | 158,292,555 |    0 |        0 |      121,231 | `f1392087d39ae5387216db714213cee9dae588131348e60761695c6688c74b79` |

Raw reports are retained locally under
`output/release-image-scan/fd168f943b973e129b2961786aeef84e7675ca42/`
and intentionally ignored by Git. The scan used OS and application packages and
High/Critical severities. An earlier scan found vulnerable Debian/runtime
packages and `nanoid@3.3.16`; the pinned distroless runtime and `nanoid@3.3.17`
closed those findings before the final scan. Registry digests do not exist
because no image was pushed.

## Migration, recovery and rollback evidence

The guarded recovery rehearsal used only loopback PostgreSQL and databases
named `kele_e2e`, `kele_m9_empty` and `kele_m9_restore`.

| Observation                          |                                                             Result |
| ------------------------------------ | -----------------------------------------------------------------: |
| Empty-database migration chain       |                                                           1,733 ms |
| Versioned application logical backup |                                                              85 ms |
| Restore transaction                  |                                                             106 ms |
| Migration verification after restore |                                                           1,625 ms |
| Backup artifact                      |                                                      202,217 bytes |
| Artifact SHA-256                     | `fa3894b7acd299b551e22385261bf3443b5a46d7ea2e3715550ad1a03b44cc02` |

Source and restored databases each contained 16 migrations, 16 customers, one
verified-payment Order, one PaymentAttempt, 3 inventory rows and 37 business
events. Invalid inventory and Orders without verified Payment were both zero.
The empty target contained all 16 migrations and no business rows.

This logical rehearsal is not a managed PostgreSQL backup/PITR claim. The
service/plan, region, retention, recovery window, key ownership and business RPO
and RTO remain unapproved and unmeasured.

Milestone 9 adds two additive administrator-identity migrations. Rollback must
retain their tables, trigger, immutable security facts and every earlier
commercial fact; it must not reverse migrations. An older application artifact
may ignore the new tables, but traffic must remain closed if it cannot safely
interpret current state. Callback ingestion, reconciliation and inventory
invariants stay available during rollback, and roll-forward is preferred where
the older artifact is incompatible.

## Material findings closed in this increment

- Added production-bound Vandar, Kavenegar and Arvan adapters with fail-closed
  configuration and provider-neutral contracts.
- Replaced static production administrator credentials with attributable,
  revocable PostgreSQL OTP sessions, CSRF protection, rotation and transactional
  revocation on disable/role change.
- Updated OpenAPI to 0.5.0 for administrator authentication and regenerated the
  TypeScript contract.
- Kept Vandar Refund completion pending because its published callback lacks a
  KELE-compatible authentication/inquiry contract.
- Patched `js-yaml` and `nanoid`, built exact non-root release artifacts and
  removed all High/Critical findings from the local final image scans.
- Removed the Playwright browser-download dependency by validating and using an
  installed browser; all 42 journeys passed on the final workspace state.
- Corrected secret-like unit fixtures without weakening the tracked-file secret
  policy.

## Remaining blockers

1. Execute and retain real Vandar IPG/Refund and Kavenegar sandbox certification
   against authorized accounts; close `CERT-M9-001` before confirming Refund.
2. Provision and certify the approved Arvan bucket/CDN and private
   Grafana/Loki/Prometheus deployment, including access, retention, redaction,
   alert delivery and recovery evidence.
3. Execute production administrator bootstrap, lower-role lifecycle,
   two-person break-glass/recovery and real Kavenegar-factor acceptance.
4. Approve the managed PostgreSQL service/plan and business RPO/RTO, then retain
   a real backup/PITR rehearsal with measured loss and recovery time.
5. Configure an authorized remote and run the CI `release-image-scan` job for
   the reviewed remote commit; retain all three JSON artifacts and record
   registry digests after an approved publication.
6. Resolve design/rights blockers `DES-001` through `DES-005` before a
   customer-facing release.

Until these are closed, staging/production is `NO-GO` and Milestone 10 must not
start. No staging/production deployment or merge occurred in this verification.

## Optional Render functional-UAT profile

`render.yaml`, `scripts/render-demo.mjs` and `docs/render-free-demo.md` define a
separate public, synthetic Render Free environment for manual functional
acceptance. The Blueprint is schema-valid and pins every service and database
to the Free plan. It is published on `feat/m09-production-hardening`, but no
Render resource has been created and no public smoke artifact exists yet.
Consequently it is not runtime evidence and closes none of the blockers above.
Free PostgreSQL has no backup/PITR and expires after 30 days; free MinIO data is
ephemeral. The profile must never be cited as staging, production readiness or
M9 `GO` evidence.
