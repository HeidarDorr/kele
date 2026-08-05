# Requirements traceability baseline

Version: 0.2
Status: Coverage ownership assigned; Milestone 6 operations evidence linked

All 174 identified rules in `03-business-rules.md` are assigned to a module,
contract area and automated test suite below. When code exists, replace
`Pending` with links to handlers/endpoints and tests for each rule. A rule must
not be marked Implemented without automated evidence unless explicitly noted as
manual UX acceptance.

| Rule IDs | Owner modules/features | Contract surface | Primary automated evidence | State |
|---|---|---|---|---|
| CAT-001–CAT-005 | Catalog, Category | Admin + storefront catalog APIs | `catalog-category.integration` | Pending |
| PUB-001–PUB-005 | Shared lifecycle policies | Admin resource commands | `publication-lifecycle.domain` | Pending |
| PUB-006 | Product | product publish | `product-publication.domain` | Pending |
| PUB-007 | ColorVariant | variant publish | `variant-publication.domain` | Pending |
| PUB-008 | SKU, Pricing | SKU publish | `sku-publication.domain` | Pending |
| PUB-009 | Outfit | outfit publish | `outfit.integration.test.ts`, protected admin publish journey | Implemented |
| PUB-010–PUB-011 | Catalog, cache/freshness | publish/edit operations | `publication-side-effects.integration` | Pending |
| PRC-001–PRC-005 | Pricing | price commands and reads | `pricing.domain` | Pending |
| PRC-006–PRC-007 | Cart, Checkout, Pricing | checkout quote | `checkout.integration.test.ts` mixed Product/Outfit repricing and snapshot tests | Implemented for Product and Outfit checkout |
| PRC-008–PRC-010 | Pricing Admin, Audit | bulk price API/history | `pricing-admin.integration` | Pending |
| INV-001–INV-002 | Inventory | inventory reads | catalog/cart plus M4 concurrency integration tests | Implemented for SKU projection and Product checkout |
| INV-003–INV-007 | Cart, Checkout, Inventory, Order | checkout/payment | `checkout.integration.test.ts` atomic mixed demand, rollback, contention and paid-conversion tests | Implemented for Product and Outfit component demand |
| INV-008–INV-014 | Inventory Admin, Audit | inventory action API | `inventory-actions.integration` | Pending |
| INV-015–INV-017 | Outfit, Inventory | outfit availability | `outfit.unit.test.ts`, `outfit.integration.test.ts` weighted component projection | Implemented without synthetic Outfit inventory |
| OTF-001–OTF-005 | Outfit | admin outfit API | `outfit.unit.test.ts`, `outfit.integration.test.ts`, Playwright admin authoring/preview/publication | Implemented |
| OTF-006–OTF-007 | Outfit, Inventory | outfit size/availability | exact mapping and shared-SKU availability tests | Implemented |
| OTF-008–OTF-013 | Outfit, Cart, Catalog | storefront/outfit checkout | mixed cart/checkout integration plus Playwright discovery, detail and review journeys | Implemented |
| CUS-001–CUS-005 | Identity, Customer | auth/profile/address API | `customer-access.e2e` | Pending |
| CUS-006–CUS-007 | Notification, Inventory | stock subscription API | `stock-notification.integration` | Pending |
| CUS-008–CUS-010 | Customer, Identity, Order | profile/session API | `customer-history.integration` | Pending |
| CRT-001–CRT-003 | Cart | cart API | identity/cart unit/integration and browser journeys | Implemented |
| CRT-004–CRT-009 | Cart, Checkout, Inventory | checkout/cart commands | mixed Product/Outfit Checkout, exact revision identity and cart-mutation cancellation tests | Implemented |
| CRT-010 | Cart | cart persistence | identity/cart PostgreSQL persistence and optimistic-concurrency tests | Implemented |
| ORD-001 | Checkout, Payment, Order | payment callback | parallel replay, failure and Product/Outfit paid-path evidence | Implemented per ADR-0004 |
| ORD-002–ORD-004 | Order, Inventory | order creation/read | immutable Product/Outfit component snapshots, exact-once and stock-consumption tests | Implemented |
| ORD-005–ORD-010 | Order Admin, Return, Audit | order transitions | `order-state-machine.domain` | Pending |
| ORD-011–ORD-017 | Shipping, Order | delivery/fulfillment API | `shipping-fulfillment.integration` | Pending |
| REV-001–REV-003 | Review, Identity | review submit API | `review-ownership.integration` | Pending |
| REV-004–REV-010 | Review Admin, Audit | moderation API | `review-moderation.integration` | Pending |
| REV-011 | Review, Order | review projection | `verified-purchase.integration` | Pending |
| CMS-001–CMS-005 | Admin, Identity | admin navigation/policies | `admin-rbac.e2e` | Pending |
| CMS-006–CMS-007 | Homepage | typed revision API, protected preview and responsive renderer | `editorial.integration.test.ts`, `e2e/editorial.spec.ts` | Implemented in Milestone 7 |
| CMS-008–CMS-009 | Media | grouped reusable Media plus editorial reference report | integration and browser reference evidence | Implemented for referenced M7 media |
| CMS-010–CMS-015 | Category, Journal, Admin | Occasion discovery, immutable Journal snapshots, SEO and protected previews | unit, integration and `e2e/editorial.spec.ts` | Implemented except unrequested cross-object search/filter |
| CMS-016 | Media | fail-closed active/historical reference report and guarded delete | `editorial.integration.test.ts`, `e2e/editorial.spec.ts` | Implemented |
| CMS-017–CMS-018 | Audit, Admin UX | append-only Business Events plus restrained RTL editorial administration | integration plus Playwright evidence | Implemented for M7 commands |
| EVT-001–EVT-004 | Audit/Event | event store/read API | `business-event.domain` | Pending |
| EVT-005–EVT-009 | Inventory, Pricing, Catalog, Order | module commands | module integration suites | Pending |
| EVT-010–EVT-012 | Reporting, Audit | event query API | `business-event-query.integration` | Pending |
| LOC-001–LOC-002 | Storefront, Admin, Content | HTML/routing/content contracts | `rtl-localization.e2e` | Pending |
| PAY-001–PAY-003 | Payment, Configuration | payment adapter/callback | foundation unit, callback abuse integration and Playwright fake-provider paths | PAY-001–PAY-002 implemented; PAY-003 production provider deferred |
| SMS-001–SMS-002 | Identity, Notification | SMS adapter | `sms-adapter.contract` | Production provider deferred |
| SHP-001–SHP-005 | Shipping, Settings, Checkout | shipping options/settings API | shipping unit boundaries, owned Checkout API and Playwright method selection | Implemented |
| SHP-006–SHP-008 | Shipping, Checkout, Order, Audit | shipping quote/settings/snapshot | threshold unit test and immutable mixed Product/Outfit Checkout/Order evidence | Implemented |
| RTE-001–RTE-005 | Return, Order, Inventory | customer/admin return API | `return-eligibility.integration` | Pending |
| OTF-014–OTF-018 | Outfit, Inventory | outfit revision/publish/reserve | immutable-row trigger, revision history, exact component reservation and rollback tests | Implemented |
| CRT-011–CRT-012 | Cart, Identity, Checkout | cart/session API | identity/cart integration and anonymous/authenticated browser journeys | Implemented |
| CRT-013–CRT-018 | Cart, Identity | cart merge command/result | deterministic merge integration/concurrency and browser review evidence | Implemented |
| SCP-001–SCP-002 | Storefront, API | scope/route absence | architecture/scope assertion | Accepted exclusion |
| PRC-011–PRC-012 | Pricing, Payment, Presentation | money schemas/formatter | money unit/contract tests plus Cart/Checkout/Order browser captures | Implemented |
| ORD-018 | Order, Customer | Order read/snapshot | immutable address and Outfit component snapshot integration tests | Implemented |
| CAT-006 | Catalog, Search | catalog list/search API | `postgres-search.integration` | Pending |
| INV-018 | Inventory, Outfit, Checkout | reservation command | `checkout.integration.test.ts` all-or-nothing component reservation and last-unit race | Implemented |

## Additional hardening requirements

These requirements were introduced by accepted ADRs and need stable IDs when
merged into the business specification:

| Temporary ID | Requirement | Evidence |
|---|---|---|
| HRD-001 | Prisma/NestJS types do not enter domain code. | architecture test |
| HRD-002 | Money persists as integer rial and presentation conversion is tested. | money unit/contract tests |
| HRD-003 | Payment callback is verified, replay-safe and idempotent. | integration/security tests |
| HRD-004 | Published Outfit composition is revisioned and immutable. | domain/integration tests |
| HRD-005 | Order is created only after verified payment. | integration test |
| HRD-006 | Reservation jobs are leased, retryable and idempotent. | job integration test |
| HRD-007 | Storefront public pages render useful server HTML. | build/E2E/SEO test |
| HRD-010 | Sensitive M6 commands bind a global idempotency key to a canonical versioned command/target/version/payload fingerprint; mismatched reuse fails before mutation and exact replay has no secondary effect. | canonical fingerprint unit suite, PostgreSQL cross-target/payload/concurrency tests and production-API 409 E2E assertion |

## Milestone 3 identity, customer and cart evidence

| Requirement IDs | Implementation | Automated evidence | State |
|---|---|---|---|
| CUS-001–CUS-005, CUS-008, CUS-010 | OTP identity, opaque server sessions, owned profile and address application services/controllers | `identity-cart.unit.test.ts`, `identity-cart.integration.test.ts`, `e2e/foundation.spec.ts` | Implemented; CUS-006–CUS-007 and CUS-009 remain later scope |
| CRT-001–CRT-004, CRT-007–CRT-008, CRT-010–CRT-012 | Anonymous/authenticated cart, signed cart cookie, current price/inventory reads, optimistic concurrency and persistence | `cart-merge.ts`, `cart.service.ts`, `identity-cart.integration.test.ts`, browser cart journey | M3 Cart implemented; M4 now completes Product checkout while Outfit checkout remains M5 |
| CRT-013–CRT-018 | Transactional deterministic merge, Product SKU combination, inventory cap/notice, unavailable retention, immutable Outfit Revision review blocker and replay receipt | merge unit/integration/concurrency tests and Playwright merge journey | Implemented |
| INV-001–INV-004, INV-017 | Current `physical - reserved` availability contract, no cart reservation, non-negative constraints and Outfit review fallback | catalog/cart integration tests, Prisma checks, unavailable browser state | M3 Cart boundary implemented; M4 adds Product reservation and M5 retains Outfit expansion |
| PRC-001, PRC-006–PRC-007, PRC-011–PRC-012 | Current append-only SKU price projection, integer IRR total and centralized exact toman presentation | cart integration tests, money unit tests, browser captures | Cart display plus M4 authoritative Product checkout quote implemented |
| SMS-001–SMS-002 | Replaceable Fake SMS adapter, explicit fixed local/test code, verifier-only persistence and production fake-provider guard | foundation/config unit tests plus OTP integration abuse tests | Fake test/local boundary implemented; production random-code provider deferred |
| LOC-001–LOC-002, HRD-001–HRD-002 | Persian RTL customer/cart surfaces, bidi isolation, inward dependencies and centralized money | architecture gate, type-check, Playwright viewport/keyboard evidence | Implemented for M3 surfaces |

## Milestone 4 checkout, payment and Order evidence

| Requirement IDs | Implementation | Automated evidence | State |
| --- | --- | --- | --- |
| PRC-006–PRC-007, PRC-011–PRC-012, CRT-004–CRT-008 | server-owned current SKU repricing, integer IRR quote, Cart/address ownership and Checkout blockers | `checkout.integration.test.ts`, generated OpenAPI contract, complete browser journey | Implemented for Product carts |
| CRT-009–CRT-010, INV-003–INV-007 | cart mutation cancellation, 30-minute atomic reservation, physical/reserved projection, leased expiry and paid consumption | PostgreSQL expiry, job retry, last-unit and callback race tests | Implemented for Product lines; Outfit component expansion remains M5 |
| ORD-001–ORD-004, ORD-018, HRD-005 | verified-success-only commercial creation, unique immutable number and item/price/address/shipping/payment snapshots | parallel exact replay, out-of-order callback, post-payment mutation and owned Order browser assertions | Implemented for Product Orders |
| PAY-001–PAY-002, HRD-003 | provider-neutral fake adapter, canonical HMAC/freshness verification, provider-event replay fingerprint and transaction monotonicity | foundation/shipping-payment units, adversarial integration and all fake browser outcomes | Implemented locally/test; real provider remains PAY-003/OQ-002-PROD |
| SHP-001–SHP-008 | versioned Post/Tipax/Tehran Local Courier fixed prices, Tehran normalization, threshold equality and immutable policy snapshots | unit boundary tests, Checkout integration and responsive Playwright selection | Implemented for Product subtotal; Outfit contribution remains M5 |
| HRD-001–HRD-002, HRD-006 | application ports, Prisma-only infrastructure, checked money, DB-backed SKIP LOCKED lease/retry | architecture/type gates and PostgreSQL worker race evidence | Implemented |
| LOC-001–LOC-002 | Persian RTL Checkout, fake gateway, result/reconciliation/expiry and Order pages with logical CSS | 12 production-build Playwright tests and `output/playwright/milestone-4/` | Implemented for M4 surfaces |

## Milestone 5 Outfit evidence

| Requirement IDs | Implementation | Automated evidence | State |
| --- | --- | --- | --- |
| OTF-001–OTF-007, PUB-009, HRD-004 | immutable Outfit identity/revisions, administrator-authored items, default colors, exact size-to-SKU mappings, validation, preview, publish, archive and history | `outfit.unit.test.ts`, `outfit.integration.test.ts`, PostgreSQL immutability trigger and Playwright admin journey | Implemented |
| OTF-008–OTF-013, INV-015–INV-017, PRC-006–PRC-007 | public discovery/detail, independent component links, revision-size pricing and weighted availability from Inventory-owned SKU projections | Outfit unit/integration suites, server-rendered production build and responsive Playwright captures | Implemented without Outfit stock |
| OTF-014–OTF-018, CRT-004–CRT-009, CRT-013–CRT-018 | exact revision-size Cart identity, no silent replacement, merge review blocker, mixed Cart aggregation and Checkout revalidation | identity/cart and checkout PostgreSQL suites plus old-revision browser journey | Implemented |
| INV-003–INV-007, INV-018 | deterministic aggregate SKU locking, all-or-nothing component reservations, rollback, last-complete-Outfit contention and paid consumption | `checkout.integration.test.ts` rollback, mixed demand and two-cart concurrency cases | Implemented |
| ORD-001–ORD-004, ORD-018, HRD-005 | verified-payment-only Order creation with immutable Outfit revision, price, size, media and exact component snapshots; historical customer rendering | Checkout/payment integration snapshot assertions and storefront Order renderer | Implemented |
| SHP-006–SHP-008, PRC-011–PRC-012 | Outfit price contributes to product/outfit subtotal while shipping policy, rial storage and centralized toman display remain snapshotted | mixed Checkout integration, money contracts and browser evidence | Implemented |
| LOC-001–LOC-002, HRD-001–HRD-002, HRD-007 | Persian RTL editorial Outfit storefront and restrained administration across mobile/tablet/laptop/desktop, with inward application ports | architecture/type/build gates, 13-test Playwright suite and `output/playwright/milestone-5/` | Implemented |

## Milestone 1 implementation evidence

| Requirement IDs | Implementation | Automated evidence | State |
|---|---|---|---|
| LOC-001, LOC-002 | `apps/storefront/app/layout.tsx`, `apps/admin/app/layout.tsx`, shared logical token CSS | `e2e/foundation.spec.ts` | Foundation implemented; feature content pending |
| PAY-001 to PAY-003 | provider-neutral fake payment port and production configuration guard | `apps/api/test/foundation.unit.test.ts`, `packages/config/src/index.test.ts` | Fake foundation implemented; production provider deferred |
| SMS-001 to SMS-002 | provider-neutral fake SMS port and production configuration guard | `apps/api/test/foundation.unit.test.ts`, `packages/config/src/index.test.ts` | Fake foundation implemented; production provider deferred |
| HRD-001 | API application ports and automated forbidden-import scan | `scripts/check-architecture.mjs`, `apps/api/test/architecture.unit.test.ts` | Implemented |
| HRD-008 | Validated startup configuration and fail-closed fake-provider policy | `packages/config/src/index.ts`, `packages/config/src/index.test.ts` | Implemented |
| HRD-009 | Contract-first health, dependency readiness and correlation propagation | `docs/openapi.yaml`, `e2e/foundation.spec.ts` | Implemented |

## Milestone 2 catalog vertical-slice evidence

| Requirement IDs | Implementation | Automated evidence | State |
|---|---|---|---|
| CAT-001–CAT-004, CAT-006 | Product → ColorVariant → SKU aggregate, category joins, variant-backed cards and parameterized PostgreSQL search | `apps/api/src/modules/catalog/`, `apps/api/test/catalog.integration.test.ts` | Implemented for Product catalog slice |
| CAT-005 | Category relationships cascade without deleting Product records; no destructive Category route is exposed | migration constraints, architecture/contract review | Structural safeguard implemented |
| PUB-001–PUB-004, PUB-006–PUB-008, PUB-010–PUB-011 | lifecycle persistence, rule-ID publication validator, transactional publish/archive and immediate no-cache reads | `catalog.unit.test.ts`, `catalog.integration.test.ts`, `e2e/foundation.spec.ts` | Implemented for Product/ColorVariant/SKU/Category |
| PUB-005 | No Product/SKU delete operation is exposed in this slice; Order-reference enforcement remains with the later Order module | OpenAPI absence/scope review | Safe exclusion; cross-module rule pending |
| PRC-001, PRC-004, PRC-009–PRC-012 | append-only SKU price records, current projection, integer IRR contracts and centralized toman presentation | `catalog.integration.test.ts`, `packages/design-system/src/money.test.ts` | Implemented for individual SKU pricing; bulk pricing excluded |
| INV-001–INV-002, INV-008–INV-010, INV-012–INV-014, INV-017 | SKU inventory projection, append-only movements, authorized predefined actions, idempotency and derived availability | `catalog.unit.test.ts`, `catalog.integration.test.ts` | Implemented for non-checkout catalog actions |
| INV-011 | `customer_return` is absent from the generic inventory contract and rejected before application logic; stock restoration remains reserved for the Milestone 6 Order/Return workflow | `docs/openapi.yaml`, `e2e/foundation.spec.ts` | Direct inventory increase closed; Order/Return workflow intentionally pending |
| CMS-002–CMS-005, CMS-008–CMS-010, CMS-013, CMS-017–CMS-018 | fail-closed role guard, media/category/product forms, protected preview, event recording and restrained administration UI | unit, integration and Playwright evidence above | Implemented for this slice |
| CMS-001, CMS-014, CMS-016 | catalog domain navigation/listing existed; at Milestone 2, cross-domain admin navigation, full filtering and media deletion/usage reporting remained later work | scope review | Historical Milestone 2 status; CMS-016 is superseded by the Milestone 7 evidence below |
| EVT-001–EVT-007 | immutable catalog, price and inventory business-event facts with actor/entity/correlation metadata | migration + `catalog.integration.test.ts` | Implemented for commands present in this slice |
| LOC-001–LOC-002, SCP-001–SCP-002 | Persian RTL semantic pages, bidi isolation and absence of Wishlist/Newsletter surfaces | `e2e/foundation.spec.ts`, Playwright screenshots | Implemented |
| HRD-001, HRD-002, HRD-007 | Prisma confined to infrastructure, tested IRR/toman boundary and useful server-rendered public HTML | architecture test, type-check/build, Playwright | Implemented |

## Milestone 6 operations, fulfillment and returns evidence

| Requirement IDs | Implementation | Automated evidence | State |
| --- | --- | --- | --- |
| ORD-005–ORD-013, ORD-017 | server-authorized cancellation and explicit `Paid -> Preparing -> Shipped -> Delivered` transitions, immutable timeline/tracking revisions and customer visibility | 36-pair state-machine unit matrix, PostgreSQL replay/illegal-transition, pending-cancellation race, tracking scope/normalization and canonical cross-Order/version/payload suite; Playwright staff/customer journey plus strict If-Match rejection | Implemented; customer cancellation remains forbidden |
| RTE-001–RTE-005, CUS-005 | owned return submission, inclusive 24-hour delivery window, mandatory declarations, quantity limits, administrator approve/reject and provider-confirmed completion | exact-boundary/+1 ms/declaration/ownership, cross-Order/Return/payload receipt tests, synchronized partial-return confirmations and browser approval flow | Implemented |
| PAY-001–PAY-002 | provider-neutral refund port, append-only attempts, safe failure/retry and confirmed-only customer wording | flaky-gateway integration, failed exact-retry replay, retry target/payload/provider-call-count tests and Fake Refund browser completion | Implemented for local/test Fake adapter; PAY-003/OQ-002-PROD remains open |
| INV-008–INV-014, INV-018 | cancellation/return component restoration through ledgers, separated Inventory/Instagram role actions and serialized no-negative inventory | PostgreSQL movement/RBAC assertions, concurrent Instagram, synchronized bulk conflict and canonical SKU/payload reuse tests; production API 403/409 acceptance | Implemented |
| PRC-008–PRC-010, EVT-001–EVT-007, CMS-002–CMS-005 | filtered price/inventory preview, kind-scoped preview reads, expiry/version validation, partial-failure reporting and searchable actor/entity/payload audit exploration | exact price/replay, price-read RBAC, cross-preview/version rejection, stale/concurrent-target integration tests, audit payload search and Playwright staff surfaces | Implemented |
| LOC-001–LOC-002, HRD-001–HRD-002, HRD-007 | Persian RTL responsive Order/return customer pages and restrained operations administration with complete states | format/lint/type/build gates, 14-test Playwright suite, CLI snapshot and `output/playwright/milestone-6/` | Implemented |

## Milestone 7 editorial platform and Site Settings evidence

| Requirement IDs | Implementation | Automated evidence | State |
| --- | --- | --- | --- |
| CMS-003, CMS-006–CMS-007, CMS-013, PUB-001–PUB-004, PUB-006–PUB-008 | Super-Admin-only typed Homepage Draft, protected preview, optimistic save, transactional publication/history and no-store public projection | `editorial.unit.test.ts`, `editorial.integration.test.ts`, `e2e/editorial.spec.ts`; CLI save/publish snapshots | Implemented |
| CMS-008–CMS-009, CMS-016 | reusable grouped Media, direct and polymorphic Draft/active/historical references, disabled UI deletion and conflict-safe delete command | PostgreSQL integration, API 409 and Playwright Media reference page | Implemented for all current reference owners |
| CMS-011, CMS-013, CAT-005, PUB-001–PUB-004 | Journal Draft/Published/Archived identity, immutable publication snapshots, unique slug, allowlisted blocks, preview, SEO and public index/detail routes | validation units, slug/isolation/snapshot integration and editor/customer Playwright journeys | Implemented; scheduling explicitly excluded because no semantics are specified |
| CMS-010, CAT-001, CAT-005 | Category/Occasion editorial title, description, hero Media, ordering and SEO while Product price/Inventory remain canonical | Occasion publication validation, API contract and four-viewport customer evidence | Implemented |
| CMS-012, CMS-017, EVT-001–EVT-007 | versioned Site Settings with actor/audit history, safe internal navigation and sensitive-copy approval metadata | settings validation/isolation integration plus management UI | Implemented for editorial settings; Checkout shipping policy ownership preserved |
| LOC-001–LOC-002, SCP-001–SCP-002, HRD-001–HRD-002, HRD-007 | Persian RTL image-led Homepage, Journal and Occasion experiences; semantic navigation, safe text rendering, reduced motion, no Wishlist/Newsletter | production build, `e2e/editorial.spec.ts`, CLI snapshots and `output/playwright/milestone-7/` | Implemented |
