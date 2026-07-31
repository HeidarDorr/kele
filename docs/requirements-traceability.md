# Requirements traceability baseline

Version: 0.1
Status: Coverage ownership assigned; implementation links pending

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
| PUB-009 | Outfit | outfit publish | `outfit-publication.domain` | Pending |
| PUB-010–PUB-011 | Catalog, cache/freshness | publish/edit operations | `publication-side-effects.integration` | Pending |
| PRC-001–PRC-005 | Pricing | price commands and reads | `pricing.domain` | Pending |
| PRC-006–PRC-007 | Cart, Checkout, Pricing | checkout quote | `checkout-repricing.integration` | Pending |
| PRC-008–PRC-010 | Pricing Admin, Audit | bulk price API/history | `pricing-admin.integration` | Pending |
| INV-001–INV-002 | Inventory | inventory reads | `inventory.domain` | Pending |
| INV-003–INV-007 | Cart, Checkout, Inventory, Order | checkout/payment | `reservation-lifecycle.integration` | Pending |
| INV-008–INV-014 | Inventory Admin, Audit | inventory action API | `inventory-actions.integration` | Pending |
| INV-015–INV-017 | Outfit, Inventory | outfit availability | `outfit-availability.domain` | Pending |
| OTF-001–OTF-005 | Outfit | admin outfit API | `outfit-composition.domain` | Pending |
| OTF-006–OTF-007 | Outfit, Inventory | outfit size/availability | `outfit-size-map.domain` | Pending |
| OTF-008–OTF-013 | Outfit, Cart, Catalog | storefront/outfit checkout | `outfit-purchase.integration` | Pending |
| CUS-001–CUS-005 | Identity, Customer | auth/profile/address API | `customer-access.e2e` | Pending |
| CUS-006–CUS-007 | Notification, Inventory | stock subscription API | `stock-notification.integration` | Pending |
| CUS-008–CUS-010 | Customer, Identity, Order | profile/session API | `customer-history.integration` | Pending |
| CRT-001–CRT-003 | Cart | cart API | `cart.domain` | Pending |
| CRT-004–CRT-009 | Cart, Checkout, Inventory | checkout/cart commands | `cart-checkout.integration` | Pending |
| CRT-010 | Cart | cart persistence | `cart-persistence.integration` | Pending |
| ORD-001 | Checkout, Payment, Order | payment callback | `paid-order-creation.integration` | Clarified ADR-0004 |
| ORD-002–ORD-004 | Order, Inventory | order creation/read | `order-snapshot.integration` | Pending |
| ORD-005–ORD-010 | Order Admin, Return, Audit | order transitions | `order-state-machine.domain` | Pending |
| ORD-011–ORD-017 | Shipping, Order | delivery/fulfillment API | `shipping-fulfillment.integration` | Pending |
| REV-001–REV-003 | Review, Identity | review submit API | `review-ownership.integration` | Pending |
| REV-004–REV-010 | Review Admin, Audit | moderation API | `review-moderation.integration` | Pending |
| REV-011 | Review, Order | review projection | `verified-purchase.integration` | Pending |
| CMS-001–CMS-005 | Admin, Identity | admin navigation/policies | `admin-rbac.e2e` | Pending |
| CMS-006–CMS-007 | Homepage | homepage admin/public API | `homepage-publication.integration` | Pending |
| CMS-008–CMS-009 | Media | media API | `media-library.integration` | Pending |
| CMS-010–CMS-015 | Category, Journal, Admin | admin APIs | `cms-workflows.e2e` | Pending |
| CMS-016 | Media | media delete | `media-reference-safety.integration` | Pending |
| CMS-017–CMS-018 | Audit, Admin UX | admin APIs/UI | integration + manual UX evidence | Pending |
| EVT-001–EVT-004 | Audit/Event | event store/read API | `business-event.domain` | Pending |
| EVT-005–EVT-009 | Inventory, Pricing, Catalog, Order | module commands | module integration suites | Pending |
| EVT-010–EVT-012 | Reporting, Audit | event query API | `business-event-query.integration` | Pending |
| LOC-001–LOC-002 | Storefront, Admin, Content | HTML/routing/content contracts | `rtl-localization.e2e` | Pending |
| PAY-001–PAY-003 | Payment, Configuration | payment adapter/callback | `payment-adapter.contract` | Production provider deferred |
| SMS-001–SMS-002 | Identity, Notification | SMS adapter | `sms-adapter.contract` | Production provider deferred |
| SHP-001–SHP-005 | Shipping, Settings, Checkout | shipping options/settings API | `shipping-quote.integration` | Pending |
| SHP-006–SHP-008 | Shipping, Checkout, Order, Audit | shipping quote/settings/snapshot | `free-shipping-boundary.integration`, `shipping-versioning.integration` | Pending |
| RTE-001–RTE-005 | Return, Order, Inventory | customer/admin return API | `return-eligibility.integration` | Pending |
| OTF-014–OTF-018 | Outfit, Inventory | outfit revision/publish/reserve | `outfit-revision.integration` | Pending |
| CRT-011–CRT-012 | Cart, Identity, Checkout | cart/session API | `guest-cart.e2e` | Pending |
| CRT-013–CRT-018 | Cart, Identity | cart merge command/result | `cart-merge.integration` | Pending |
| SCP-001–SCP-002 | Storefront, API | scope/route absence | architecture/scope assertion | Accepted exclusion |
| PRC-011–PRC-012 | Pricing, Payment, Presentation | money schemas/formatter | `irr-toman.contract` | Pending |
| ORD-018 | Order, Customer | Order read/snapshot | `order-address-snapshot.integration` | Pending |
| CAT-006 | Catalog, Search | catalog list/search API | `postgres-search.integration` | Pending |
| INV-018 | Inventory, Outfit, Checkout | reservation command | `atomic-outfit-reservation.integration` | Pending |

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
| CMS-001, CMS-014, CMS-016 | catalog domain navigation/listing exists; cross-domain admin navigation, full filtering and media deletion/usage reporting remain later work | scope review | Partial; not claimed complete |
| EVT-001–EVT-007 | immutable catalog, price and inventory business-event facts with actor/entity/correlation metadata | migration + `catalog.integration.test.ts` | Implemented for commands present in this slice |
| LOC-001–LOC-002, SCP-001–SCP-002 | Persian RTL semantic pages, bidi isolation and absence of Wishlist/Newsletter surfaces | `e2e/foundation.spec.ts`, Playwright screenshots | Implemented |
| HRD-001, HRD-002, HRD-007 | Prisma confined to infrastructure, tested IRR/toman boundary and useful server-rendered public HTML | architecture test, type-check/build, Playwright | Implemented |
