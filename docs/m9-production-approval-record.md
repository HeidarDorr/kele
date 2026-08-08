# Milestone 9 production decision and certification record

Version: 0.5

Status: **FIVE DECISIONS APPROVED; local implementation and image gates pass;
external certification remains NO-GO**

This record is the single approval handoff for the five production decisions
that cannot be inferred from implementation. A row becomes approved only when
all named values, accountable owners and approval dates are present. A provider
name alone is not approval, and an approved decision is not sandbox
certification.

## Approval register

| Decision      | Approved answer                                                                                                                                                                                               | Owner and approval                                                                |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| `OQ-002-PROD` | Vandar IPG v3 + Refund v3; IRR; server inquiry/verify; merchant-paid fee; explicit operator retry; `VANDAR_IPG_API_KEY`, `VANDAR_REFUND_ACCESS_TOKEN`, `VANDAR_REFUND_REFRESH_TOKEN`, `VANDAR_BUSINESS_NAME`. | Payments & Finance Owner; approved by Product Owner at 2026-08-07T15:05:23+03:30. |
| `OQ-003-PROD` | Kavenegar REST v1 Verify Lookup; Persian `KeleOtp` template; 3/8 second connect/total timeout; 48-hour provider status window; `KAVENEGAR_API_KEY`, `KAVENEGAR_OTP_TEMPLATE`.                                 | Identity Owner; approved by Product Owner at 2026-08-07T15:05:23+03:30.           |
| `OQ-017`      | KELE-managed Grafana OSS 13, Loki 3.7 and Prometheus 3 in Iran; 30-day logs, 90-day metrics, 365-day alert facts; no attachments/raw payloads; SEV-1/2 on-call routing.                                       | Platform/On-call Owner; approved by Product Owner at 2026-08-07T15:05:23+03:30.   |
| `OQ-018`      | ArvanCloud Simin Object Storage `ir-thr-at1` multi-zone + CDN; private encrypted/versioned bucket; <=15-minute signed URLs; quarantine scanning and explicit invalidation.                                    | Platform Owner; approved by Product Owner at 2026-08-07T15:05:23+03:30.           |
| `OQ-022`      | First-party PostgreSQL administrator principals and sessions; pre-provisioned DB roles, Kavenegar OTP, 30-minute idle/12-hour absolute expiry, transactional revocation and one-time two-person break-glass.  | Security Owner; approved by Product Owner at 2026-08-07T15:05:23+03:30.           |

For every row, record `approved provider/product`, `approved protocol version or
documentation date`, `sandbox identifier`, `production region`, `non-secret
credential names`, `commercial/retention limits`, `accountable owner`,
`approver`, and `approved at`. Secret values must never be placed in this file.

## Certification register

Certification starts only after the corresponding approval row is complete.
Each result must identify the Git commit and immutable image ID/digest, sandbox
tenant/project, provider documentation version, execution time and operator,
with redacted request/response evidence.

| Decision      | Minimum pass evidence                                                                                                                                                                                                                              | State                                                                                                                                                                                                                                                              |
| ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `OQ-002-PROD` | Intent creation; authenticated success/failure callback; exact replay; altered replay rejection; delayed/out-of-order callback; inquiry mismatch and reconciliation; refund success/failure/retry; timeout; amount/currency and settlement checks. | Pending real Vandar sandbox credential and merchant Refund activation. `CERT-M9-001` also blocks refund completion because the published Refund v3 callback contract has no documented authentication or status inquiry. Local mock evidence is not certification. |
| `OQ-003-PROD` | Accepted, rejected, timeout and delivery-report outcomes; duplicate request behavior; Persian OTP template; sender identity; rate/commercial limit; redaction and retention checks.                                                                | Pending Kavenegar account/API key and approved `KeleOtp` template. Local mock evidence is not certification.                                                                                                                                                       |
| `OQ-017`      | Scrubbed test exception and correlation; zero secret/mobile/address leakage; sampling and retention verification; alert delivery, acknowledgement and recovery; regional ingestion verification.                                                   | Pending deployable private-cluster endpoint and on-call destination.                                                                                                                                                                                               |
| `OQ-018`      | Private upload/read/delete; signed URL expiry; denied anonymous/origin-bypass access; CDN cache/invalidation; version/lifecycle/retention; encryption and access logs; malware-failure behavior.                                                   | Pending Arvan account, access keys, bucket and CDN hostname.                                                                                                                                                                                                       |
| `OQ-022`      | Super-Admin and lower-role issuance; deny-by-default access; expiry; logout/revocation; role change; recovery/break-glass; attributable audit and four-viewport browser acceptance.                                                                | PostgreSQL session, revocation, guard and login-flow implementation is locally testable. Offline bootstrap/recovery and the real SMS factor remain pending; the latter shares the OQ-003 credential block.                                                         |

## Local implementation evidence

Local evidence was refreshed on 2026-08-08 against branch
`feat/m09-production-hardening`. It establishes application behavior only and
does not convert any external row above to certified.

| Boundary               | Evidence                                                                                                                                                                                   |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Vandar                 | Bounded IPG inquiry/verification and Refund request adapters pass unit and PostgreSQL orchestration tests; refunds remain `pending` without authenticated provider truth.                  |
| Kavenegar              | Verify Lookup response/delivery-status contracts pass unit tests; customer and administrator OTP/session behavior passes PostgreSQL integration.                                           |
| Administrator identity | Opaque session rotation, CSRF, idle/absolute expiry, logout, role/disable revocation and immutable security audit behavior pass; the four-viewport login shell has no horizontal overflow. |
| Arvan storage          | The S3-compatible private object/presigning adapter and fail-closed configuration pass local contracts; no real bucket or CDN operation was attempted.                                     |
| Observability          | Redacted correlated events, protected Prometheus metrics and alert thresholds pass application tests; no regional cluster ingestion/notification was attempted.                            |
| Browser/load           | Chrome 151 completed 42/42 production-build journeys; all five local profiles recorded zero unexpected errors.                                                                             |
| Recovery               | PostgreSQL 16 logical backup/restore reproduced all 16 migrations, 16 synthetic customers, one verified-payment Order and 37 business events with no invalid inventory.                    |

The final local release-image candidate is
`fd168f943b973e129b2961786aeef84e7675ca42`. Trivy 0.69.3 found zero High and
zero Critical vulnerabilities in its API, Storefront and Administration images.
The three raw JSON reports are retained locally under
`output/release-image-scan/fd168f943b973e129b2961786aeef84e7675ca42/`.
This does not satisfy the separately required remote CI run: this checkout has
no Git remote or authenticated GitHub execution path, no image was published,
and no registry digest exists.

## External access preflight — 2026-08-08

Preflight time: 2026-08-08T12:53:54+03:30. Reviewed commit:
`d066e5b73e9906d7d504663772be5b70224546a6`. This is a redacted access audit,
not provider certification. No credential value, mobile number, account
identifier or tenant identifier was read, emitted or stored; no external write,
account creation, purchase or provisioning action occurred.

| Boundary               | Redacted observation                                                                                                                                                                                                        | Result                        |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------- |
| Vandar                 | Required IPG/Refund environment names are absent. The official login link redirected to a dashboard hostname that returned `ERR_NAME_NOT_RESOLVED` in the available browser. No authenticated tenant/session was available. | `BLOCKED_EXTERNAL_ACCESS`     |
| Kavenegar              | `KAVENEGAR_API_KEY` and template configuration are absent. The provider login endpoint returned a visible `Server Unavailable` response. No authenticated tenant/session or real OTP receptor was available.                | `BLOCKED_EXTERNAL_ACCESS`     |
| Arvan                  | Only local MinIO values exist in the development environment. The Arvan account page rendered the unauthenticated login flow; no bucket/CDN tenant, keys or signed-in session was available.                                | `BLOCKED_EXTERNAL_ACCESS`     |
| Observability          | No private Grafana/Loki/Prometheus endpoint, bearer credential, on-call destination, Kubernetes context, Terraform root or Helm chart is configured.                                                                        | `BLOCKED_EXTERNAL_ACCESS`     |
| Administrator exercise | No real Kavenegar factor, production administrator principal, two-person approver identities or approved break-glass escrow is available. Local database tests are not relabelled as a real-factor exercise.                | `BLOCKED_EXTERNAL_ACCESS`     |
| Managed PostgreSQL     | `DATABASE_URL` is loopback/local only. No managed service/plan, tenant, region, backup/PITR control plane, approved RPO/RTO or authorized fault-injection target is configured.                                             | `BLOCKED_DECISION_AND_ACCESS` |
| Remote CI              | The repository has no Git remote or authenticated GitHub execution path. The user's required separate remote/CI authorization has not been supplied.                                                                        | `BLOCKED_SEPARATE_APPROVAL`   |

The next external run must replace each blocked observation with the immutable
tenant/project identifier, operator, start/end times, reviewed Git/image digest,
redacted request/response or control-plane evidence, expected/actual result and
cleanup confirmation. A browser login alone is insufficient certification.

### Refund completion safety boundary

The local Vandar adapter can submit a bounded, idempotency-keyed Refund request
and persist only `pending` or `failed`. It deliberately does not expose a
Refund-notification route. The published Vandar Refund v3 documentation shows
an asynchronous `notify_url` payload but no callback signature, shared secret
or authenticated Refund-status inquiry. Treating that payload as authoritative
would conflict with KELE's authenticated, replay-safe external-callback rule.
`CERT-M9-001` must therefore be closed with provider-backed evidence or an
explicitly approved ADR addendum before a provider result may confirm a Refund.

## Managed PostgreSQL recovery approval

The managed database service/plan, region, encryption/key ownership, automated
backup retention, PITR window/granularity, cross-zone/cross-region behavior,
approved RPO, approved RTO, database/platform owner and approval date are not
yet supplied. Until all are explicit, the successful local logical rehearsal
does not establish a production recovery claim.

The managed rehearsal must record:

1. source service/plan and immutable application image digest;
2. backup/PITR configuration and pre-fault recovery point;
3. fault injection and requested recovery timestamp;
4. provider operation timestamps and measured data-loss interval/RPO;
5. measured application recovery time/RTO;
6. migration count, readiness, storefront/admin smoke, callback reachability,
   verified-payment-only Orders and non-negative inventory checks;
7. access-control, encryption and audit-log evidence; and
8. operator, approver, evidence location and cleanup confirmation.

Passing the local `pnpm test:m9:recovery` command remains necessary but is not a
substitute for this managed-service record.
