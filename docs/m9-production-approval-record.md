# Milestone 9 production decision and certification record

Version: 0.1

Status: **UNAPPROVED — production and staging remain NO-GO**

This record is the single approval handoff for the five production decisions
that cannot be inferred from implementation. A row becomes approved only when
all named values, accountable owners and approval dates are present. A provider
name alone is not approval, and an approved decision is not sandbox
certification.

## Approval register

| Decision      | Current state | Required approval package                                                                                                                                                                                                                                                                               |
| ------------- | ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `OQ-002-PROD` | Open          | Payment/refund provider and product; IRR support; intent, authenticated callback, inquiry, reconciliation and refund protocols; idempotency; settlement behavior; timeout/retry limits; sandbox and production credential names; commercial limits; provider, finance, security and engineering owners. |
| `OQ-003-PROD` | Open          | SMS provider/product; sender identity; OTP template/encoding; delivery-report protocol; timeout/retry and rate/commercial limits; data retention/region; sandbox and production credential names; provider, security and identity owners.                                                               |
| `OQ-017`      | Open          | Error-monitoring provider/project; ingestion region; data residency; event/attachment policy; PII scrubbing; sampling; retention; alert destinations/escalation; credential name; security and on-call owners.                                                                                          |
| `OQ-018`      | Open          | S3-compatible storage and CDN products; region; private bucket and encryption policy; upload/signing model; public hostname; cache/invalidation; versioning/lifecycle; malware handling; credential names; platform/content/security owners.                                                            |
| `OQ-022`      | Open          | Administration identity/session authority; issuance and expiry; role source and provisioning; revocation propagation; recovery/break-glass; MFA; audit ownership; credential/key names; security and operations owners.                                                                                 |

For every row, record `approved provider/product`, `approved protocol version or
documentation date`, `sandbox identifier`, `production region`, `non-secret
credential names`, `commercial/retention limits`, `accountable owner`,
`approver`, and `approved at`. Secret values must never be placed in this file.

## Certification register

Certification starts only after the corresponding approval row is complete.
Each result must identify the Git commit and immutable image ID/digest, sandbox
tenant/project, provider documentation version, execution time and operator,
with redacted request/response evidence.

| Decision      | Minimum pass evidence                                                                                                                                                                                                                              | State               |
| ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------- |
| `OQ-002-PROD` | Intent creation; authenticated success/failure callback; exact replay; altered replay rejection; delayed/out-of-order callback; inquiry mismatch and reconciliation; refund success/failure/retry; timeout; amount/currency and settlement checks. | Blocked by approval |
| `OQ-003-PROD` | Accepted, rejected, timeout and delivery-report outcomes; duplicate request behavior; Persian OTP template; sender identity; rate/commercial limit; redaction and retention checks.                                                                | Blocked by approval |
| `OQ-017`      | Scrubbed test exception and correlation; zero secret/mobile/address leakage; sampling and retention verification; alert delivery, acknowledgement and recovery; regional ingestion verification.                                                   | Blocked by approval |
| `OQ-018`      | Private upload/read/delete; signed URL expiry; denied anonymous/origin-bypass access; CDN cache/invalidation; version/lifecycle/retention; encryption and access logs; malware-failure behavior.                                                   | Blocked by approval |
| `OQ-022`      | Super-Admin and lower-role issuance; deny-by-default access; expiry; logout/revocation; role change; recovery/break-glass; attributable audit and four-viewport browser acceptance.                                                                | Blocked by approval |

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
