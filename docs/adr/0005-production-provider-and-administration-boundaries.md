# ADR-0005: Production provider and administration boundaries

Status: Accepted
Date: 2026-08-07
Decision owner: Product Owner
Approver: Product Owner, by explicit instruction in the Milestone 9 project thread
Implements: OQ-002-PROD, OQ-003-PROD, OQ-017, OQ-018 and OQ-022

## Context

Milestone 9 deliberately stopped before choosing production payment/refund,
SMS, error monitoring, object storage/CDN and administration-session
authorities. Fake providers, local MinIO, structured-log-only monitoring and
static administrator tokens cannot be used in staging or production.

The production choices must work from Iran, preserve the existing inward
application ports, avoid exporting customer data unnecessarily and support
provider-specific certification without changing commercial domain behavior.

## Decision

### Payment and refund (`OQ-002-PROD`)

Use Vandar IPG v3 for IRR payment initiation, server-side transaction inquiry
and verification, and Vandar Refund v3 for full or partial return to the payer's
card. The merchant, not the customer, bears the gateway fee so the verified
amount is compared exactly with the immutable IRR PaymentAttempt amount.

- Payment API key: `VANDAR_IPG_API_KEY`.
- Refund credentials: `VANDAR_REFUND_ACCESS_TOKEN` and
  `VANDAR_REFUND_REFRESH_TOKEN`; rotation is an operator action and values are
  never persisted by the application.
- Business name: `VANDAR_BUSINESS_NAME`.
- HTTP connect/total timeout: 3/10 seconds; application retries no payment
  initiation or refund automatically. An operator retry uses a new approved
  idempotency key after inquiry.
- The provider token is the callback event identity. Provider inquiry/verify,
  not browser input, establishes payment truth. A callback never creates an
  Order until amount, currency, provider transaction and reservation state
  agree.
- Refund requests use the KELE idempotency key as Vandar `payment_number` and
  remain pending until the provider webhook/inquiry confirms completion.
- The merchant contract must enable IPG and Refund, maintain sufficient wallet
  balance and record fees/settlement caps before production enablement.

### SMS (`OQ-003-PROD`)

Use Kavenegar REST v1 Verify Lookup with the approved `KeleOtp` template. The
only variable is a six-digit OTP; no name, address, order or free-form customer
content is transmitted.

- Credential: `KAVENEGAR_API_KEY`.
- Template: `KAVENEGAR_OTP_TEMPLATE=KeleOtp` with Persian text
  `کد ورود KELE: %token`.
- Lookup selects the service line; KELE does not infer or override a sender.
- Connect/total timeout: 3/8 seconds; no automatic retry after an ambiguous
  response. Resend is a new rate-limited OTP challenge.
- Delivery status is queried by provider message ID or received through the
  configured HTTPS callback. Provider status lookup is limited to 48 hours;
  KELE retains only opaque message ID, bounded status and correlation for 30
  days.
- Account quota, approved template and spend alerts must be recorded in the
  sandbox/merchant certification before production enablement.

### Error monitoring (`OQ-017`)

Use a KELE-managed, self-hosted observability stack in the approved Iran
production region: Grafana OSS 13, Loki 3.7 and Prometheus 3. Application JSON
logs remain the transport contract and the protected Prometheus surface remains
the metrics contract. No Grafana Cloud or other foreign SaaS receives data.

- Loki and Prometheus are private-network only; Grafana is behind the approved
  administration identity boundary.
- Logs retain for 30 days, metrics for 90 days and alert/audit facts for 365
  days. Attachments, request bodies and raw provider payloads are disabled.
- Production sampling is 100% for error/security/provider outcomes and 10% for
  successful informational HTTP events. Existing recursive PII/secret
  scrubbing runs before export.
- Alertmanager routes SEV-1 to the Operations On-call and Security On-call and
  SEV-2 to the owning engineering rota. Alert acknowledgement is required
  within 5 and 15 minutes respectively.
- Credentials: `LOKI_PUSH_URL`, `LOKI_TENANT_ID`, `LOKI_PUSH_TOKEN`,
  `GRAFANA_ADMIN_BOOTSTRAP_SECRET` and the existing
  `METRICS_BEARER_TOKEN`.

### Object storage and CDN (`OQ-018`)

Use ArvanCloud Object Storage in the Simin `ir-thr-at1` region with multi-zone
enabled and ArvanCloud CDN in front of a separate public delivery hostname.

- Provider value: `arvan_s3`; endpoint, region and bucket remain explicit.
- The origin bucket is private. Applications use least-privilege S3 access
  keys, signed upload/read URLs with a maximum 15-minute lifetime and never
  expose the origin credentials to a browser.
- Server-side encryption, versioning and access logging are mandatory. Current
  versions retain 30 days; non-current versions retain 90 days; incomplete
  multipart uploads expire after 24 hours.
- CDN caches immutable versioned media for one year. Mutable aliases use a
  five-minute cache and require explicit invalidation. Origin bypass and public
  bucket access are denied.
- Raster content is quarantined until MIME signature, decoder limits and
  malware scanning pass. A scan failure never creates publishable metadata.
- Credentials: `STORAGE_ACCESS_KEY`, `STORAGE_SECRET_KEY`,
  `STORAGE_ENDPOINT`, `STORAGE_REGION`, `STORAGE_BUCKET`,
  `STORAGE_PUBLIC_BASE_URL` and `ARVAN_CDN_API_TOKEN`.

### Administration identity and sessions (`OQ-022`)

Use first-party KELE administration principals, roles and opaque sessions in
PostgreSQL. Authentication is Kavenegar OTP to a pre-provisioned administrator
mobile; customer identity never grants administration access.

- Roles are `super_admin`, `inventory_admin` and `instagram_admin`; role and
  enabled state come only from the administration principal record.
- OTP expires after 5 minutes and five failed attempts. Sessions rotate on
  authentication, idle-expire after 30 minutes, absolutely expire after 12
  hours and use Secure, HttpOnly, SameSite=Strict cookies plus CSRF protection.
- Disabling a principal or changing a role revokes all sessions in the same
  transaction. Every issuance, denial, role change, revocation and break-glass
  use is attributable in immutable audit history.
- Initial Super Admin provisioning and recovery use a one-time, offline
  bootstrap command with two-person approval. There is no reusable static
  production token. Break-glass credentials expire after 30 minutes and force
  normal OTP re-enrolment.
- Credentials/keys: `ADMIN_SESSION_SIGNING_SECRET`,
  `ADMIN_OTP_VERIFIER_PEPPER` and one-time
  `ADMIN_BOOTSTRAP_TOKEN_HASH`; no plaintext bootstrap token is stored.

## Ownership

| Boundary                | Accountable owner        | Required consulted owners                                     |
| ----------------------- | ------------------------ | ------------------------------------------------------------- |
| Payment/refund          | Payments & Finance Owner | Security Owner; Backend Engineering Owner; Operations On-call |
| SMS/OTP                 | Identity Owner           | Security Owner; Provider Operations Owner                     |
| Error monitoring        | Platform/On-call Owner   | Security Owner; API Owner                                     |
| Storage/CDN             | Platform Owner           | Content Owner; Security Owner                                 |
| Administration identity | Security Owner           | Operations Owner; Product Owner; API Owner                    |

The role owners are durable accountabilities. Named people and their current
rota membership belong in the access-controlled operations directory, not in
the source repository.

## Certification boundary

Acceptance of this ADR authorizes implementation of only these adapters and
contracts. It does not claim that a provider account, paid plan, bucket,
template, tenant, signed merchant agreement or sandbox credential already
exists. Provider certification is a separate evidence gate and must use real
provider endpoints with redacted artifacts. A mock server is contract-test
evidence only and must never be labelled sandbox certification.

The published Refund v3 `notify_url` contract does not currently document a
callback signature, shared secret or authenticated Refund-status inquiry. This
is recorded as `CERT-M9-001`. Until provider-backed certification establishes a
replay-safe authority, the request adapter must remain fail-closed at `pending`,
no Refund notification endpoint may be exposed and no provider notification may
confirm a commercial Refund.

## Consequences

- Production configuration can fail closed against every other provider.
- Vandar refund capability matches the post-delivery return lifecycle, unlike
  a short payment reversal window.
- Observability data remains inside the selected Iran deployment boundary and
  avoids a sanctions-sensitive SaaS dependency.
- Administration gains per-person attribution and immediate revocation at the
  cost of an additive identity migration and login flow.
- Provider commercial onboarding and real sandbox certifications remain
  release prerequisites even after adapter contract tests pass.
