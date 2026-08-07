# Security baseline and threat model

Version: 0.1
Status: Required baseline

## Protected assets

- customer identity, mobile number, addresses and order history;
- OTP and session credentials;
- product pricing and inventory integrity;
- administrative privileges;
- payment references and refund operations;
- unpublished content and media;
- immutable business and audit history.

## Trust boundaries

- public browser to Next.js/NestJS;
- administration browser to protected APIs;
- API to PostgreSQL and object storage;
- API to SMS and payment providers;
- provider callbacks to public callback endpoints;
- background worker to operational tables.

## Authentication

- Development and automated tests use a Fake SMS Provider through the same
  centralized adapter contract as production. Fake OTP values must never be
  enabled in production configuration.
- Real-provider OTP codes must be cryptographically random, single-use and
  short-lived. The development/test Fake SMS provider deliberately uses the
  explicit fixed code `FAKE_SMS_OTP_CODE`; both paths store only a verifier,
  never plaintext.
- Apply rate limits by mobile number, IP/risk signal, and device/session.
- Responses must not reveal whether an account exists.
- Failed attempts are bounded; resend has cooldown and daily limits.
- Production sessions use `Secure`, `HttpOnly`, appropriate `SameSite`, short
  idle expiry, absolute expiry, rotation, and server-side revocation.
- State-changing cookie-authenticated requests require CSRF protection.

## Authorization

- Deny by default.
- Enforce authorization in backend application policies, never only in UI.
- Customer resources are always scoped to the authenticated customer.
- Administrative roles follow the business specification and can be extended
  by explicit permissions.
- High-impact actions require recent authentication and an audit reason where
  applicable.
- Tests include horizontal and vertical privilege escalation attempts.

## Payment

- Development and automated tests use a Fake Payment Adapter. Production startup
  must fail closed if the fake adapter is selected.
- Verify callback authenticity with the provider through its supported secure
  mechanism.
- Do not trust amount, status, or order references from the browser.
- Reconcile provider amount/currency against the CheckoutSession snapshot.
- Enforce a unique provider transaction reference and idempotent callback.
- Reject replay, stale, mismatched, or unverified callbacks without changing
  order or inventory state.
- Log redacted metadata, never card data or secrets.

## Inventory and business integrity

- Use database transactions and conditional updates/locks for reservations.
- Constraints prevent negative stock and over-reservation.
- All stock, price, return, cancellation, and refund actions are auditable.
- API idempotency keys are required for retryable state-changing operations.
- Job leases and transitions are compare-and-set/idempotent.
- Outfit component reservations execute atomically; partial component holds are
  forbidden.

## Shipping and returns

- Shipping prices and thresholds are permission-protected, versioned and
  audited. The client cannot submit an authoritative shipping price or
  free-shipping result.
- The server computes Order Subtotal from current Product and Outfit prices.
  Client-supplied subtotal, shipping, discount, and tax values are never trusted
  for free-shipping eligibility.
- Tehran Local Courier eligibility is determined from server-side normalized
  address data.
- Orders retain immutable address and shipping-policy snapshots; address-book
  edits cannot rewrite history.
- Return eligibility is computed from the recorded delivery-confirmation
  timestamp and server time.
- Customer condition declarations are evidence for review, not automatic
  approval. Only authorized administrators may approve a return.

Milestone 6 additionally enforces:

- order, return, refund, audit and bulk permissions in API guards; customer
  ownership is resolved from the server session and never accepted from input;
- CSRF validation on customer return submission plus mandatory idempotency keys;
  Order transition, tracking and bulk apply bind the submitted optimistic
  version, while unversioned return/refund/inventory commands bind an explicit
  `null` resource version and retain their row/state locks;
- sensitive M6 keys are global command identities. A canonical SHA-256 receipt
  binds command type, target, resource version and normalized payload before a
  target lock, business write or refund-provider call. Exact replay passes
  authorization again but creates no second fact/provider call; any mismatch
  fails with 409 `IDEMPOTENCY_KEY_REUSED` before domain mutation;
- raw keys are constrained to 16–120 characters at every M6 HTTP boundary.
  Internally derived timeline/tracking/inventory fact keys are always 133
  characters, outside that client namespace, and fit only in audited
  160-character fact columns. PostgreSQL rejects CommandReceipt updates;
- `If-Match` accepts only a fully quoted positive safe integer; malformed,
  partially parsed and unsafe versions fail before fingerprinting or mutation;
- Inventory Admin can submit only production/manual/damaged actions. Instagram
  Admin can submit only `instagram_sale` and `instagram_return`; Website `sale`
  is not an administration command, and Instagram audit search is scoped to its
  own actor identity;
- a pending/failed cancellation Refund blocks fulfillment under the Order lock,
  and provider confirmation locks/revalidates the Order before restoring stock
  or moving its projection to Cancelled;
- confirmations for different partial-return Refunds serialize on their shared
  Order before whole-return evaluation and cannot lose or duplicate the terminal
  Returned transition;
- a refund is called confirmed only from the configured gateway response. The
  Fake Refund adapter is local/test evidence and cannot establish a production
  refund claim; OQ-002-PROD remains open;
- bulk writes require a persisted preview, reason, expiry and per-target version
  check. Price preview details remain Super-Admin-only. Target projections lock
  in stable SKU-ID order; stale/lost-CAS targets fail individually and never
  authorize an unpreviewed destructive operation or erase earlier item results;
- audit payload search uses parameterized SQL and returns safe event payloads;
  session, OTP, CSRF and provider secrets are forbidden from those payloads.

## Application security

- Validate all input at the boundary; reject unknown fields for sensitive
  commands.
- Encode output and sanitize rich Journal content with an allowlist.
- Use parameterized database access.
- Configure CSP, HSTS, MIME sniffing prevention, referrer policy, and frame
  protections.
- CORS is an allowlist, not `*` with credentials.
- Uploads are size/type checked, decoded to validate actual media, renamed,
  stored outside executable paths, and scanned where available.
- SVG upload is forbidden or sanitized through a dedicated pipeline.
- SSRF-prone remote image fetching uses strict host allowlists.

### Milestone 7 editorial enforcement

- Every editorial management and preview route is guarded by a server-managed
  administrator session and Super Admin role; missing, invalid and lower-role
  sessions fail closed.
- Homepage links and Site navigation accept safe internal paths only. Journal
  external links require HTTPS. Journal bodies are a closed union of structured
  blocks and are rendered through React text encoding rather than arbitrary
  HTML.
- Draft reads and previews are never exposed by public controllers. Public
  routes read Published Homepage/Settings rows or immutable Journal snapshots.
- If-Match is a fully quoted positive safe integer on editorial writes and
  publication, preventing stale overwrite.
- Media deletion first returns every direct and polymorphic Draft, active and
  historical reference; a foreign-key race is converted to a safe conflict.
- Legal, pricing, shipping and returns announcements cannot publish without an
  attributable content approver and ISO approval time. Checkout-owned shipping
  prices and thresholds are not writable through editorial settings.
- Audit events record actor, entity, correlation ID and non-secret change
  metadata for save, publish, archive, discovery, settings and Media deletion.

## Secrets and privacy

- Secrets come from environment/secret management and are never committed.
- `.env.example` contains names and safe descriptions only.
- Production data is not copied into local development.
- Logs redact mobile numbers, addresses, tokens and provider payloads.
- Define retention for OTP, sessions, carts, payment attempts, logs and audit
  records before production.
- Customer account deletion anonymizes allowable personal data while preserving
  legally required commercial records.

## Dependency and delivery security

- Lock dependencies and use automated vulnerability scanning.
- CI performs secret scanning, dependency audit, tests and image scanning.
- Containers run as non-root with minimal production dependencies.
- Database and object storage are private; backups are encrypted and tested.
- Production access is least-privilege and attributable.

## Required abuse tests

- OTP enumeration, brute force and resend flooding.
- Session fixation, theft and revocation.
- IDOR across addresses, carts, orders and reviews.
- Role bypass for inventory, price, content and user management.
- Duplicate/replayed payment callback.
- Concurrent purchase of the last SKU.
- Malicious rich text and file uploads.
- Checkout amount, SKU and shipping tampering.

## Milestone 1 enforcement

- `@kele/config` rejects any production startup while Fake Payment or Fake SMS
  is selected; no production provider or credential is present in this
  repository.
- The API emits structured JSON logs with request correlation IDs and redacts
  fields whose names indicate credentials, tokens, mobile numbers or addresses.
- CI runs a production dependency audit and Gitleaks. The local `scan:secrets`
  command adds a fast Git-indexed tracked-file policy scan before CI; it does
  not follow ignored/untracked runtime directories and does not replace the CI
  scan.
- Local PostgreSQL/MinIO credentials are explicitly development-only examples;
  `.env` remains ignored.

## Milestone 3 identity and cart enforcement

- Fake SMS challenges use the configured six-digit `FAKE_SMS_OTP_CODE`; a
  future real provider must supply the cryptographically random generator.
  Every challenge still uses a unique salt plus server pepper with `scrypt`;
  PostgreSQL stores only the verifier.
  Mobile, IP and device risk identifiers are HMAC-derived before persistence.
- Challenge policy enforces a 60-second resend cooldown, five sends per mobile
  per day, five per device per hour, twenty per IP per hour, five verification
  failures and five-minute expiry. Consumed, expired and replayed challenges
  cannot create a session.
- Session and CSRF tokens are independent high-entropy opaque values. Only
  hashes are persisted; successful sign-in rotates a presented session and
  logout revokes it. Idle expiry is 30 minutes and absolute expiry is seven
  days. Production cookies are `Secure`, and session cookies are always
  `HttpOnly` and `SameSite=Lax`.
- Cookie-authenticated mutations validate a double-submit value against the
  server session hash. Anonymous cart mutations validate signed cart/device
  cookies and anonymous CSRF. The Next same-origin BFF forwards only an
  allowlist of transport headers and upstream cookies.
- Address reads and writes include both `addressId` and authenticated
  `customerId`; foreign and unknown identifiers produce the same not-found
  result. Authenticated carts are resolved from the session customer, never a
  client-supplied owner.
- Cart writes lock the cart and require the observed version. Guest merge and
  authentication share one transaction and a unique merge receipt, preventing
  replay or partial identity/cart state. Invalid foreign replay does not expose
  the other customer's merged cart.
- Fake SMS is local/test only and does not invent a real delivery protocol.
  Its fixed code is shown on the non-production sign-in page and exercised by
  E2E directly; no OTP inspection endpoint, plaintext database field or OTP
  log was added. Production startup continues to reject Fake SMS.

## Milestone 4 checkout and payment enforcement

- Checkout accepts only an authenticated customer's owned Cart and Address,
  validates CSRF and idempotency, locks Cart/inventory deterministically, and
  recalculates publication, current price, availability, shipping and payable
  amount on the server. The browser cannot submit subtotal, shipping price,
  threshold result, currency or payment amount.
- Tehran eligibility is derived from normalized server-owned province/city
  fields. Shipping settings are permission-protected effective versions; quote
  and Order retain the exact method, fixed charge, threshold decision and
  policy version.
- The Fake Payment Adapter signs a canonical bounded payload with HMAC-SHA256.
  Verification uses constant-time comparison, rejects callbacks older than
  five minutes or more than 30 seconds in the future, and occurs before any
  commercial transaction. `FAKE_PAYMENT_SIGNING_SECRET` is local/test-only;
  production continues to reject the fake provider.
- Provider event identity plus payload hash makes exact callback replay stable;
  provider transaction uniqueness on PaymentAttempt/Order prevents cross-attempt
  duplication. A paid attempt is monotonic: a late failure returns the existing
  paid result and a different transaction ID cannot rewrite it.
- Verified amount mismatch, success after expiry, and incomplete hold enter
  reconciliation with zero Orders and zero physical deduction. Unsupported
  currency is rejected at the callback DTO boundary before commercial
  processing. Forged, stale, unmatched and event-collision callbacks roll back
  without a receipt or commercial mutation; raw callback payloads and
  signatures are not logged.
- Database locks, conditional version updates, uniqueness and quantity checks
  enforce exactly-once conversion and non-negative inventory. Cart mutation
  cancels an open checkout and releases its reservations in the same command
  transaction. Scheduler delay cannot authorize an expired payment.
- Database jobs are claimed with `FOR UPDATE SKIP LOCKED`, a 60-second lease,
  bounded attempts and backoff. Handler replay is safe and job correctness is
  secondary to synchronous Checkout/payment state validation.

Automated abuse evidence includes concurrent last-unit checkout, exact parallel
callback replay, out-of-order status, forged HMAC, stale timestamp, changed
transaction, amount tampering, incomplete reservation, expiry/payment race and
job lease/retry. No real card data, provider credential, refund surface or
production callback protocol was introduced.

## Pre-production security exit

- Provider-specific payment threat review completed.
- SMS/OTP abuse limits load-tested.
- Access-control matrix tested.
- Backup restore exercised.
- No critical/high dependency finding without an accepted exception.
- Privacy, returns, shipping and terms content approved by the business.

## Milestone 9 production hardening

- Production configuration fails closed for Fake Payment, Fake Refund, Fake
  SMS, local MinIO, development static administrator sessions and the
  unapproved error-monitoring selection. Development-prefixed identity,
  administrator and metrics credentials and non-HTTPS production endpoints are
  also rejected. This is an intentional launch block for OQ-002-PROD,
  OQ-003-PROD, OQ-017, OQ-018 and OQ-022, not provider selection.
- Payment/refund/SMS application ports expose provider-neutral strings and
  canonical results only. Fake simulation remains a separate local/test port;
  unsupported callback providers are rejected before verification or a
  commercial transaction.
- API parsing is bounded to `API_JSON_BODY_LIMIT_BYTES`; 400/413 transport
  errors become stable Problem Details without stack traces. Request, header,
  keep-alive and readiness timeouts are validated. CORS accepts only the exact
  storefront and administration origins with credentials.
- API/storefront/admin emit explicit CSP, frame denial, MIME sniffing denial,
  referrer, permissions and cross-origin policies. HSTS is production-only.
  Proxy trust is a bounded explicit hop count.
- OTP verification and payment callback guards use HMAC-derived risk keys,
  bounded in-process windows and fail-closed saturation. The persisted OTP
  challenge limits remain authoritative. Multi-replica aggregate enforcement
  must live at the approved edge/API gateway; Redis was not introduced. The
  transport now explicitly preserves the OpenAPI 200 success, 400 invalid-code
  and 429 limited outcomes under the HTTP abuse profile.
- Media metadata accepts only bounded raster dimensions and immutable
  same-origin `/media/...` JPG/JPEG/PNG/WebP paths whose extension matches the
  declared format. Remote URLs and SVG are rejected. No binary upload or
  malware-scanning claim is made while OQ-018 is open.
- Structured telemetry recursively redacts sensitive keys and recognizable
  bearer/cookie/credential/mobile text, bounds depth/entries/string length and
  emits only stable low-cardinality provider outcomes. Metrics authorization
  uses constant-time digest comparison; metrics are `no-store` and contain no
  customer or commercial identifiers.
- Static administrator tokens are development/test fixtures, compare in
  constant time and are rejected in production. OQ-022 blocks staging and
  production until issuance, role provisioning, recovery and revocation are
  explicitly approved and certified.
- The production dependency graph overrides the affected transitive OpenAPI
  tooling path to `js-yaml@4.3.1`; the regenerated lockfile, inspected
  dependency path and production audit report no known vulnerability. A future
  lockfile update must preserve the no-unaccepted-High/Critical gate.

Residual risks are the five open decisions above, provider-specific callback,
inquiry and outage behavior, managed secret rotation, malware inspection,
distributed edge limiting and the production monitoring data policy. They are
release `NO-GO` items; none is represented as implemented by the local Fake or
structured-log paths.
