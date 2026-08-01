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
- OTP codes are cryptographically random, single-use, short-lived, and stored
  as a verifier rather than plaintext.
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
  command adds a fast policy scan before CI; it does not replace the CI scan.
- Local PostgreSQL/MinIO credentials are explicitly development-only examples;
  `.env` remains ignored.

## Milestone 3 identity and cart enforcement

- OTP challenges use a cryptographically random six-digit value and a unique
  salt plus server pepper with `scrypt`; PostgreSQL stores only the verifier.
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
  Tests control the verifier inside the guarded disposable E2E database; no
  OTP inspection endpoint, plaintext database field or OTP log was added.

## Pre-production security exit

- Provider-specific payment threat review completed.
- SMS/OTP abuse limits load-tested.
- Access-control matrix tested.
- Backup restore exercised.
- No critical/high dependency finding without an accepted exception.
- Privacy, returns, shipping and terms content approved by the business.
