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

## Pre-production security exit

- Provider-specific payment threat review completed.
- SMS/OTP abuse limits load-tested.
- Access-control matrix tested.
- Backup restore exercised.
- No critical/high dependency finding without an accepted exception.
- Privacy, returns, shipping and terms content approved by the business.
