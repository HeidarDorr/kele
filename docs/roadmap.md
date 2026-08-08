# Delivery roadmap

Version: 0.2

Status: Proposed execution plan

Last reviewed: 2026-07-30

Each milestone must produce a reviewable, tested increment. Milestones are
executed sequentially. Dates and staffing are intentionally absent until
capacity is known.

The copy-ready operating prompts and model recommendations are maintained in
`execution/v1-milestone-playbook.md`.

## Milestone 0 — specification hardening

Status: Complete

Deliverables:

- canonical document index and normalized Markdown;
- accepted stack and domain ADRs;
- resolved product questions and a remaining production/design register;
- baseline OpenAPI and data model;
- security, testing, deployment, design and Definition of Done;
- Git and agent operating contract.

Exit:

- no undocumented contradiction blocks the first implementation slice;
- remaining provider and design decisions have explicit gates.

## Milestone 1 — workspace and engineering foundation

Deliverables:

1. Scaffold the TypeScript workspace and pin the runtime and package manager.
2. Create the NestJS API, Next.js storefront and Next.js administration app.
3. Add PostgreSQL and MinIO development services.
4. Enforce strict TypeScript, formatting, linting and architecture boundaries.
5. Add CI, test harnesses, OpenAPI validation and dependency/secret scanning.
6. Add validated configuration, structured logging and correlation IDs.
7. Implement health checks and a development seed framework.
8. Configure Persian (`fa-IR`) and RTL foundations.
9. Implement provider-neutral Fake Payment and Fake SMS adapters.

Exit: a clean clone can start, test and build all applications reproducibly.

## Milestone 2 — catalog vertical slice

Deliverables:

1. Implement Product, ColorVariant, SKU, Media and Category persistence.
2. Implement publication validators mapped to CAT/PUB rules.
3. Implement price and inventory ledgers.
4. Implement the administration create/edit/publish product workflow.
5. Implement public catalog, category and product-detail APIs.
6. Implement the storefront shell, category listing and product detail page
   using the visual references.
7. Add responsive images, metadata, structured data and accessibility evidence.

Exit: an administrator can publish a valid product and a customer can discover
and view it correctly on all required viewports.

## Milestone 3 — identity, customer and cart

Status: Complete and locally verified on `feat/m03-identity-customer-cart`
(2026-08-01); not pushed, merged or deployed.

Deliverables:

1. Implement OTP challenge/session security with the fake provider.
2. Implement customer profile and address ownership.
3. Implement anonymous and authenticated carts.
4. Implement deterministic guest-cart merge with inventory caps, notices,
   unavailable lines and Outfit Revision review states.
5. Revalidate current price and availability.
6. Implement sign-in, account, address, cart drawer/page and failure states.

Exit: a customer can browse anonymously, authenticate and retain a valid cart
without bypassing ownership or checkout-blocking rules.

## Milestone 4 — checkout, reservation, payment and order creation

Deliverables:

1. Implement CheckoutSession quote and shipping contracts.
2. Implement versioned shipping settings for Iran Post, Tipax and Tehran Local
   Courier.
3. Implement Tehran eligibility and configurable free-shipping threshold rules.
4. Implement transactional SKU reservations and expiry.
5. Implement the database-backed idempotent expiry job.
6. Implement payment abstraction and the fake adapter.
7. Implement authenticated, verified, replay-safe payment callbacks.
8. Implement atomic paid Order creation, immutable address/shipping snapshots
   and stock deduction.
9. Implement checkout and payment-result UI.
10. Add concurrency, replay, reconciliation and failure-recovery tests.

Exit: the product-to-paid-order path passes adversarial concurrency,
idempotency and authorization tests.

## Milestone 5 — Outfit

Deliverables:

1. Implement immutable, versioned Outfit composition.
2. Implement explicit Outfit-size to component-SKU mappings.
3. Derive Outfit price and availability.
4. Implement administration authoring, validation and publication.
5. Implement Outfit listing and product-detail experiences.
6. Implement atomic component reservations and immutable order snapshots.
7. Integrate Outfit lines with cart merge, checkout and order history.

Exit: a published Outfit can be discovered, selected, purchased and audited
without storing synthetic Outfit inventory.

## Milestone 6 — operations, fulfillment and returns

Deliverables:

1. Implement order administration and the fulfillment state machine.
2. Implement shipping tracking.
3. Implement cancellation, return and refund workflows.
4. Enforce the 24-hour return-request window and condition declarations.
5. Implement Instagram inventory actions.
6. Implement audit/event exploration.
7. Implement safe price and inventory bulk operations.
8. Implement customer order history, order detail and return-request UI.

Exit: operations staff can fulfill and service an order with immutable history,
authorization controls and auditable transitions.

## Milestone 7 — editorial platform and site settings

Implementation status: complete on `feat/m07-editorial-platform`; final
production content and campaign Media approval remain launch dependencies.

Deliverables:

1. Implement homepage section management and preview.
2. Implement media reference safety.
3. Implement Journal authoring, preview, publishing and SEO.
4. Implement category and occasion discovery content.
5. Implement versioned site settings with audit.
6. Implement the corresponding storefront experiences.

Exit: approved editorial content can be previewed, published, discovered and
rolled forward safely without code changes.

## Milestone 8 — storefront experience and visual fidelity

Deliverables:

1. Complete all version-1 storefront routes and cross-route navigation.
2. Apply one coherent KELE design system to all prior vertical slices.
3. Match the supplied references and approved extrapolations at desktop,
   tablet and mobile viewports.
4. Complete loading, empty, error, disabled, unavailable and success states.
5. Complete keyboard, focus, contrast, reduced-motion and mixed-direction
   behavior.
6. Establish repeatable screenshot and visual-regression evidence.
7. Close approved DES-001 through DES-005 inputs or record explicit launch
   waivers for unresolved items.

Exit: the full customer journey is visually coherent, responsive, accessible
and approved against objective UI acceptance evidence.

## Milestone 9 — production integrations and operational hardening

Implementation status: provider-bound hardening was independently reverified on
`feat/m09-production-hardening` (2026-08-08), including 42 browser journeys,
four viewports, all five synthetic load profiles, 50 PostgreSQL integration
tests and an isolated 16-migration backup/restore rehearsal. ADR-0005 resolves
OQ-002-PROD, OQ-003-PROD, OQ-017, OQ-018 and OQ-022, and their approved adapters
plus the PostgreSQL administrator-session path are implemented locally. Three
exact non-root release images were built, smoked and scanned locally with zero
High/Critical findings. Staging/production remain `NO-GO` until real
provider/regional certifications, `CERT-M9-001`, administrator recovery, the
managed PostgreSQL PITR/RPO/RTO rehearsal and a retained remote CI image scan
pass for the reviewed commit. The browser gate uses installed Chrome without
downloading Playwright Headless Shell. See
`docs/milestone-9-verification.md`.

Deliverables:

1. Integrate the approved payment provider behind the existing adapter.
2. Integrate the approved SMS provider behind the existing adapter.
3. Integrate the approved object storage/CDN and error-monitoring providers.
4. Complete provider sandbox certification and reconciliation behavior.
5. Complete performance, load, security and abuse testing.
6. Complete production observability, alerts, backup/restore and runbooks.
7. Complete migration and rollback rehearsals.

Exit: production dependencies are replaceable, verified in their sandbox or
staging environments and covered by operational recovery procedures.

## Milestone 10 — release candidate, UAT and launch

Deliverables:

1. Freeze the release-candidate scope and produce the requirements coverage
   report.
2. Import or prepare approved content and product data.
3. Obtain explicit approval for legal, privacy, pricing, shipping and returns
   copy.
4. Run full regression, accessibility, visual and security gates.
5. Run staging business acceptance and resolve release-blocking findings.
6. Produce the launch, rollback and post-launch verification checklist.
7. Tag the releasable version.
8. Deploy only after explicit production approval.

Exit: the accepted release candidate is traceable, recoverable and either
deployed with explicit approval or ready for an authorized operator to deploy.

## Sequential execution gate

Before starting Milestone N:

1. Milestone N-1 is reviewed against `definition-of-done.md`.
2. Its branch is merged into the current local `main`.
3. `main` is clean and all baseline checks pass.
4. Any new blocking question is resolved or explicitly limits only an
   independent feature.
5. The monitor records a `GO`, `CONDITIONAL GO` or `NO-GO` decision.

Do not run milestone implementation chats concurrently in the same working
tree. A milestone may use tightly scoped subagents only when its active prompt
explicitly permits them and their file ownership cannot overlap.

## Scope control

Wishlist, newsletter, multilingual UI, loyalty, gift cards, marketplace,
external ERP, dedicated search engines and advanced search remain outside
version 1 unless scope is explicitly changed with requirements, acceptance
criteria and roadmap impact.
