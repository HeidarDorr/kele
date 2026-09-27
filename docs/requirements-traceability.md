# Requirements traceability baseline

Version: 0.2
Status: Coverage ownership assigned; Milestone 6 operations evidence linked

All 175 identified rules in `03-business-rules.md` are assigned to a module,
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
| OTF-008–OTF-013, OTF-019–OTF-020 | Outfit, Cart, Catalog | storefront/outfit checkout and atomic Product selection | mixed cart/checkout integration plus Playwright discovery, detail and review journeys | Implemented |
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
| OTF-008–OTF-013, OTF-019–OTF-021, INV-015–INV-017, PRC-001, PRC-006–PRC-007 | public discovery/detail, lowest revision-size pricing on every shared Outfit card, lowest-price default detail selection, independent component links, weighted availability from Inventory-owned SKU projections, and atomic fallback to independent exact-SKU Product lines after any component omission | Outfit and default-size-selection unit tests, Outfit and identity/cart integration suites, generated OpenAPI contract, server-rendered production build and responsive Playwright captures | Implemented without Outfit stock or customized Outfit identity |
| OTF-014–OTF-018, CRT-004–CRT-009, CRT-013–CRT-018 | exact revision-size Cart identity, no silent replacement, merge review blocker, mixed Cart aggregation and Checkout revalidation | identity/cart and checkout PostgreSQL suites plus old-revision browser journey | Implemented |
| INV-003–INV-007, INV-018 | deterministic aggregate SKU locking, all-or-nothing component reservations, rollback, last-complete-Outfit contention and paid consumption | `checkout.integration.test.ts` rollback, mixed demand and two-cart concurrency cases | Implemented |
| ORD-001–ORD-004, ORD-018, HRD-005 | verified-payment-only Order creation with immutable Outfit revision, price, size, media and exact component snapshots; historical customer rendering | Checkout/payment integration snapshot assertions and storefront Order renderer | Implemented |
| SHP-006–SHP-008, PRC-011–PRC-012 | Outfit price contributes to product/outfit subtotal while shipping policy, rial storage and centralized toman display remain snapshotted | mixed Checkout integration, money contracts and browser evidence | Implemented |
| LOC-001–LOC-002, HRD-001–HRD-002, HRD-007 | Persian RTL editorial Outfit storefront and restrained administration across mobile/tablet/laptop/desktop, with inward application ports | architecture/type/build gates, 13-test Playwright suite and `output/playwright/milestone-5/` | Implemented |

## Milestone 8 storefront experience and visual-fidelity evidence

| Requirement IDs | Implementation | Automated evidence | State |
| --- | --- | --- | --- |
| LOC-001–LOC-002, HRD-007 | complete Persian RTL customer route graph, shared semantic shell, mixed-direction isolation, useful server HTML, responsive compositions and a nearest segment/root skeleton boundary for every file-backed page | `apps/storefront/loading-boundaries.unit.test.ts`, `e2e/milestone-8.spec.ts` 76-route/viewport visual matrix, internal-link crawl, Next production build and delayed-navigation browser review | Implemented; refreshed route-transition captures remain part of this change's visual evidence and multilingual UI remains outside V1 |
| CAT-001–CAT-006, PUB-001–PUB-004, PUB-006–PUB-008 | Homepage/Catalog/Search/Category/PDP discovery, canonical price/availability rendering, color gallery, unavailable sizes, related discovery and consistent layout-shaped loading/empty/error states | public route matrix, 20 fixture states, keyboard gallery assertions and `output/playwright/milestone-8/route-matrix/` | Implemented without API/schema changes |
| OTF-008–OTF-021, INV-015–INV-018 | Outfit discovery/detail, exact revision, image-backed exact Product/color links inside component options, related-Product discovery in place of the repeated lower composition box, derived availability, disabled unavailable sizes, Cart review blockers and atomic independent-Product fallback after component omission | `e2e/foundation.spec.ts` component image/link and related-section assertions, responsive Outfit captures and inherited integration/concurrency suites | Implemented; Outfit inventory and customized Outfit composition are never stored |
| CRT-001–CRT-018, CUS-001–CUS-010 | anonymous/authenticated Cart, focus-contained drawer, unavailable/requires-review/error feedback, OTP, Profile and owned Address workflows | authenticated fixture, keyboard-only drawer/menu journey, Cart client-failure capture and Account matrix | Implemented for V1 customer surface |
| SHP-001–SHP-008, PAY-001–PAY-003, ORD-001–ORD-018, RTE-001–RTE-005 | server-priced Checkout, three shipping methods, fake-provider outcomes, owned Order history/detail and declaration-gated Return success | authenticated Checkout/Fake Payment/Payment Result/Order matrix and successful Return submission screenshot | UI implemented; production payment provider remains OQ-002-PROD |
| CMS-006–CMS-013, CMS-016–CMS-018 | published Homepage, Occasion and Journal projections with missing-media fallback and safe existing-route navigation | public route matrix, internal-link integrity crawl, loading/no-data/failure captures and Article evidence | Implemented; SRC-M8-001 prevents unapproved `/about` and `/contact` links |
| SCP-001–SCP-002 | no Wishlist or Newsletter route/control introduced by the visual extrapolation | route/link crawl and scope inspection | Accepted exclusion preserved |
| LOC-001–LOC-002, HRD-001–HRD-002 | KELE tokens, provisional signature wordmark, exact toman presentation boundary, logical CSS, semantic icons, focus visibility, reduced motion and WCAG AA contrast | decoded logo/image assertions, zero critical/serious Axe findings on five critical routes, 44×44 button checks, zero-overflow matrix and reduced-motion journey | Implemented for review; the final logo system remains an open DES-001 launch blocker alongside DES-002–DES-005 |

## Temporary typography pairing — 2026-09-05

| Requirement IDs | Implementation | Automated evidence | State |
| --- | --- | --- | --- |
| LOC-001–LOC-002, HRD-001–HRD-002 | Shared `estedad-vazirmatn` default: Estedad headings and Vazirmatn body, controls, labels and prices in Storefront and Administration; shared Display XL, Display L and Heading M fluid roles replace oversized page-specific heading scales; locally bundled variable WOFF2 fonts with upstream provenance/OFL; explicit legacy rollback settings and unchanged signature artwork | Typography resolver/configuration tests, `e2e/foundation.spec.ts` family/loading assertions and computed family/size/overflow review at 390/768/1280/1440; retain the selected pair's screenshots separately from legacy evidence | Temporary user-requested pairing implemented; refreshed visual evidence is required for this change. DES-002 remains open for final brand sign-off; no business/API/schema change or customer-facing claim approval |

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
| PAY-001–PAY-002 | provider-neutral refund port, append-only attempts, safe failure/retry and confirmed-only customer wording | flaky-gateway integration, failed exact-retry replay, retry target/payload/provider-call-count tests and Fake Refund browser completion | Implemented for local/test Fake adapter; ADR-0005 later selects Vandar Refund v3 and real certification remains pending |
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
| LOC-001–LOC-002, SCP-001–SCP-002, HRD-001–HRD-002, HRD-007 | Persian RTL image-led Homepage, Journal and Occasion experiences; semantic navigation, safe text rendering, reduced motion, no Wishlist/Newsletter | production build, exact-one Article JSON-LD assertion, responsive state matrix in `e2e/editorial.spec.ts`, stable reference snapshots in `output/playwright/milestone-7/`, ignored gate output in `output/playwright/.e2e-run/milestone-7/` | Implemented |

## Milestone 9 production hardening evidence

| Requirement IDs | Implementation | Automated evidence | State |
| --- | --- | --- | --- |
| PAY-001–PAY-003, ORD-001–ORD-004, ORD-018, OQ-002-PROD | provider-neutral payment/refund contracts plus ADR-0005 Vandar IPG v3 inquiry/verify callback and Refund v3 adapter; exact IRR reconciliation and Fake rejection remain in the application service | Vandar adapter contract units, checkout/operations PostgreSQL replay/outage suites, configuration tests and Playwright callback/security acceptance | Approved adapter implemented; real merchant sandbox/refund certification remains blocked by absent credentials/account |
| SMS-001–SMS-002, CUS-001–CUS-005, CUS-010, OQ-003-PROD | Kavenegar Verify Lookup OTP dispatch and 48-hour delivery-status adapter behind the provider-neutral port; persisted customer/admin OTP policies remain provider-independent | Kavenegar response/status contract units, customer and administrator PostgreSQL integration, hardening units, authentication E2E and `identity-abuse` load profile | Approved adapter implemented; real template/account/delivery certification remains blocked by absent credentials |
| CMS-002–CMS-005, CMS-008–CMS-009, CMS-016–CMS-017, OQ-018, OQ-022 | deny-by-default administration; PostgreSQL administrator OTP/session authority with CSRF, rotation and DB-triggered role/disable revocation; private Arvan-compatible signed storage namespace | administrator guard units, administrator/catalog/editorial integration, OpenAPI contract and four-viewport production-build login/admin acceptance | Local implementation verified; real Kavenegar factor, bootstrap/break-glass and Arvan bucket/CDN/malware certification remain blocked |
| EVT-001–EVT-012, HRD-008–HRD-010, OQ-017 | redacted correlated JSON events and protected Prometheus metrics are the application contract for the approved private Grafana/Loki/Prometheus deployment | hardening unit tests, OpenAPI contract, production-build Playwright and secret/dependency gates | Application contract implemented; regional ingestion, retention and alert delivery/acknowledgement await the private cluster |
| HRD-001–HRD-007 | inward provider ports, PostgreSQL-only critical consistency, bounded transaction acquisition/execution, production build, no-download browser selection, pinned distroless non-root release images, five-profile synthetic load and guarded migration/backup/restore/rollback procedures without prohibited infrastructure | architecture gate, 51-test PostgreSQL suite, 42-journey installed-Chrome four-viewport evidence, three-service runtime probes, three local Trivy reports with zero High/Critical findings, five load profiles and `test:m9:recovery` | Independent local hardening reverified on PostgreSQL 16.14; external certifications, `CERT-M9-001`, managed PITR/RPO/RTO and retained remote CI image scans still block production exit |

## Product catalog, Media and input-compatibility evidence

| Requirement IDs | Implementation | Automated evidence | State |
| --- | --- | --- | --- |
| CUS-011 | shared Persian/Arabic digit normalization for customer OTP, administrator OTP and recipient mobile DTOs; E.164 persistence boundary | `packages/design-system/src/mobile.test.ts`, API DTO validation and TypeScript contract | Implemented |
| CAT-001, CAT-007 | active Products parent navigation; supplied WebP artwork in the physical-left desktop promo, four-by-two desktop group grid, two-column mobile disclosure and responsive Catalog group index; unnumbered discovery surfaces; published Product and independent Outfit cards aggregated in the Catalog result grid without changing their APIs, prices, availability or routes | navigation units, Storefront type-check/build and Playwright review at 390×844, 768×1024, 1280×800 and 1440×900 with decoded-image, Outfit-link and zero-overflow assertions | Implemented |
| CAT-008 | enriched ColorVariant card projection, compact active-state swatches, same-color secondary-image hover and compact Outfit cards | OpenAPI contract, catalog units, strict type-check, Storefront production build and PostgreSQL-seeded Playwright replay at 390×844, 768×1024 and 1440×900 | Implemented |
| CAT-009 | all-published-color Product-detail gallery, selected-color initial focus and RTL-aware mobile touch navigation with mirrored previous/next motion and vertical-scroll preservation | `product-gallery-model.unit.test.ts`, Storefront strict type-check/build and Product-detail browser review at 390×844 and 1440×900 | Implemented |
| CMS-019 | centralized full-surface file picker, upload/selection previews across Product, Outfit, Homepage, Journal and Occasion forms, MIME-signature/dimension limits, Object Storage write and same-origin private-object read; standalone library uploads are color-neutral while Product color remains owned by ColorVariant authoring | upload parser units, file-chooser Playwright acceptance, OpenAPI validation and Admin production build | Implemented for local/UAT; production remains fail-closed under OQ-023 |
| CMS-020, ADR-0002, PRC-001, PRC-009–PRC-012 | dynamic ColorVariant/Media/SKU editor with server-generated internal color codes, per-color-size IRR price and immutable existing SKU/Inventory boundaries | API contract, internal color-code units, strict type-check, Admin production build, deterministic seed replay and 51-test PostgreSQL integration suite | Implemented and persistence-reverified on PostgreSQL 16 |
