# Delivery roadmap

Version: 0.1  
Status: Proposed execution plan

Each milestone must produce a reviewable, tested increment. Dates and staffing
are intentionally absent until team capacity is known.

## Milestone 0 — specification hardening

Deliverables:

- canonical document index and normalized Markdown;
- accepted stack and domain ADRs;
- open-question register;
- baseline OpenAPI and data model;
- security, testing, deployment, design and Definition of Done;
- Git/agent operating contract.

Exit:

- no undocumented contradiction blocks the first vertical slice;
- product owner approves blocking assumptions for Milestone 1.

## Milestone 1 — workspace and engineering foundation

Suggested issues:

1. Scaffold TypeScript workspace and pin runtime/package manager.
2. Create NestJS API, Next.js storefront and Next.js admin.
3. Add PostgreSQL/MinIO development environment.
4. Enforce strict TypeScript, lint, formatting and architecture boundaries.
5. Add CI, test harness, OpenAPI validation and secret scanning.
6. Add configuration validation, structured logging and correlation IDs.
7. Implement health checks and development seed framework.

Exit: clean clone can start, test and build all applications reproducibly.

## Milestone 2 — catalog vertical slice

Suggested issues:

1. Product, ColorVariant, SKU, Media and Category persistence.
2. Publication validators mapped to CAT/PUB rules.
3. Price and inventory ledgers.
4. Admin create/edit/publish product workflow.
5. Public catalog and product-detail API.
6. Storefront homepage shell, product card and PDP based on references.
7. Responsive images, SEO metadata and accessibility evidence.

Exit: admin publishes a product that appears correctly in the storefront.

## Milestone 3 — identity and cart

Suggested issues:

1. OTP challenge/session security with fake provider.
2. Customer profile and address ownership.
3. Anonymous and authenticated carts.
4. Cart merge on login.
5. Current price/availability revalidation.
6. Cart UI and failure states.

Exit: a customer can browse, authenticate and maintain a valid cart.

## Milestone 4 — checkout, inventory reservation and payment

Suggested issues:

1. CheckoutSession quote and shipping contracts.
2. Transactional SKU reservation.
3. Database-backed reservation expiry job.
4. Payment provider abstraction and fake adapter.
5. Verified/idempotent callback.
6. Atomic paid Order creation and stock deduction.
7. Concurrency, replay and reconciliation tests.
8. Checkout/payment result UI.

Exit: the complete product-to-paid-order vertical slice passes adversarial tests.

## Milestone 5 — Outfit

Blocked by OQ-006.

Suggested issues:

1. Versioned Outfit composition.
2. Explicit size-to-component mapping.
3. Derived availability and price.
4. Admin publish validation.
5. Storefront Outfit listing/PDP.
6. Atomic component reservations and immutable order snapshots.

## Milestone 6 — operations and fulfillment

- order administration and fulfillment state machine;
- shipping tracking;
- cancellation, return and refund workflows;
- Instagram inventory actions;
- audit/event explorer;
- price and inventory bulk operations.

## Milestone 7 — editorial platform

- homepage section management;
- media reference safety;
- Journal editor, preview, publish and SEO;
- categories and occasion discovery;
- site settings with audit.

## Milestone 8 — launch hardening

- complete UI coverage and approved copy/assets;
- provider integrations and sandbox certification;
- load, security, accessibility and visual regression testing;
- observability dashboards and alerts;
- migration rehearsal, backup restore and rollback rehearsal;
- privacy/legal/returns/shipping approval;
- staging business acceptance and launch checklist.

## Scope control

Wishlist, newsletter, multilingual UI, loyalty, gift cards, marketplace,
external ERP and advanced search remain outside version 1 unless scope is
explicitly changed with requirements, acceptance criteria and roadmap impact.

