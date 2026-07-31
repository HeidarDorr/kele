# Milestone 2 catalog vertical slice plan

Status: Implementation baseline

Branch: `feat/m02-catalog-vertical-slice`

Base commit: `c62c99e8e4e1b5dbc67dbbee7a875bde0b6d1248`

## Outcome

An authorized administrator can create, edit, validate, preview, and publish a
complete Product with Category, ColorVariant, Media, SKU, price, and inventory
facts. A customer can then discover the published item through category and
PostgreSQL-backed catalog search and view a server-rendered product detail page
at all required viewports.

## Rules in scope

- Catalog: CAT-001 through CAT-006.
- Publication: PUB-001 through PUB-008, PUB-010, and PUB-011.
- Pricing: PRC-001, PRC-004, PRC-009 through PRC-012.
- Inventory: INV-001, INV-002, INV-008 through INV-010, INV-012 through
  INV-014, and INV-017.
- Administration and media: CMS-001 through CMS-005, CMS-008 through CMS-010,
  CMS-013, CMS-014, CMS-016 through CMS-018.
- Events: EVT-001 through EVT-007 where catalog, price, and inventory facts are
  changed.
- Localization and scope: LOC-001, LOC-002, SCP-001, and SCP-002.
- Architecture: HRD-001, HRD-002, and HRD-007.

Bulk catalog and bulk price operations remain later administration work. The
Milestone implements individual price and inventory commands needed to publish
and demonstrate one complete vertical slice.

## Acceptance criteria

### Contract and persistence

1. OpenAPI defines public category, catalog search/list, and product detail
   responses plus the administration Category, Media, Product, validation,
   preview, publish, price, and inventory operations used by this slice.
2. Product owns commercial identity, SEO, lifecycle, and Category references.
   ColorVariant owns ordered color-specific Media assignments. SKU owns its
   immutable globally unique code and normalized size.
3. Price changes append immutable `PriceRecord` facts in integer IRR while a
   current-price projection is available per SKU.
4. Inventory changes append immutable `InventoryMovement` facts and update the
   current projection transactionally. Physical and reserved quantities stay
   non-negative, reserved quantity never exceeds physical quantity, and
   available quantity is derived.
5. Catalog persistence is implemented through Prisma repositories contained in
   infrastructure. Prisma, NestJS, HTTP, and storage SDK types do not enter
   domain or application contracts.
6. Required uniqueness, lifecycle, ledger, search, and lookup indexes are
   represented by a reversible Prisma migration with rollback notes.

### Publication and authorization

7. Draft and archived objects are absent from public category, search, list,
   and detail operations.
8. Publication validation reports stable rule IDs and field locations for each
   failure. Product, ColorVariant, and SKU publication enforce PUB-006,
   PUB-007, and PUB-008 without modifying price or inventory facts.
9. A publish command changes a complete aggregate to public visibility in one
   transaction and emits immutable business events. Saving an already
   published product becomes visible without deployment or manual cache work.
10. Only a Super Admin can create or change Categories, Media assignments,
    Product commercial data, variants, SKUs, prices, and publication state.
    Inventory Admin can perform allowed inventory actions but cannot change
    commercial catalog data. Anonymous and insufficiently privileged requests
    fail closed.
11. Preview uses a protected administration operation and never makes a draft
    discoverable through a public endpoint.

### Public discovery

12. Public category discovery returns published Categories in configured
    display order and only cards backed by published Product, ColorVariant, and
    SKU data.
13. Catalog cards may represent a selected ColorVariant but retain Product
    identity. They include useful responsive Media metadata, color
    availability, a current price, and derived availability.
14. Version 1 search uses PostgreSQL over approved Product, ColorVariant, SKU,
    and Category fields with documented Persian normalization, deterministic
    ordering, category filtering, and safe bounded input.
15. Product detail selects a valid published ColorVariant, returns its ordered
    gallery and SKUs, exposes zero-stock SKUs as unavailable, and never exposes
    draft or archived children.
16. Public money values remain integer IRR in transport contracts. The
    storefront uses one exact, tested IRR-to-toman formatter.

### Administration experience

17. The administration application provides an explicit create/edit flow for
    Category, Product identity, variants, Media, SKUs, price, and inventory.
18. Validation can be run before publication and renders all actionable
    failures without discarding entered data.
19. Preview clearly identifies a non-public draft. Publish has a distinct
    success state and refreshes the authoritative persisted result.
20. Forms have visible labels, inline errors, disabled and submitting states,
    keyboard operation, useful focus treatment, and mixed-direction isolation
    for SKU and slug values.

### Storefront and visual acceptance

21. Public pages produce useful server-rendered HTML with `lang="fa-IR"` and
    `dir="rtl"`, semantic landmarks, one H1, useful link names, and logical CSS
    properties.
22. The storefront shell, category listing, search result, and product detail
    follow the supplied references as visual direction: editorial image-led
    hierarchy, generous spacing, thin dividers, near-flat surfaces, restrained
    interaction, and no default component-library appearance.
23. Product Media reserves aspect ratio, supplies responsive `sizes`, preserves
    focal points through `object-position`, includes useful Persian alt text,
    and renders a stable error fallback.
24. Category and product pages provide SEO title, description, canonical URL,
    Open Graph data, and valid Product/BreadcrumbList structured data where
    applicable.
25. Loading, empty, error, partial-data, unavailable, disabled, and success
    states are implemented and reviewable without inventing cart behavior.
26. Keyboard focus, minimum practical 44 px targets, reduced motion, contrast,
    RTL reading order, and mixed Persian/Latin identifiers pass browser
    acceptance.
27. Deterministic screenshots are captured at 390 x 844, 768 x 1024,
    1280 x 800, and 1440 x 900 under `output/playwright/milestone-2/`.

### Temporary fonts and scope exclusions

28. The supplied Elize webfont is used provisionally for storefront display
    headings and the text stand-in for the future logo. Peyda is used
    provisionally for Persian UI and body text.
29. Only production webfont files required by the applications are moved into
    application assets. Duplicate desktop, legacy WOFF, and unused weight files
    from the supplied top-level folder are removed as part of that move.
30. Documentation continues to identify fonts and logo as provisional design
    inputs. No font choice is recorded as an accepted or frozen brand decision.
31. Wishlist, Newsletter, cart, checkout, multilingual UI, Outfit, reviews,
    speculative filters, and customer-facing shipping or return claims are not
    implemented.

## Failure cases

- Duplicate Category or Product slug, duplicate normalized color within a
  Product, duplicate normalized size within a ColorVariant, or reused SKU code.
- Product has no Category, ColorVariant, or SKU.
- ColorVariant has no parent, SKU, or assigned image.
- SKU parent Product or ColorVariant is not published, or SKU has no positive
  current price.
- Product or child status combinations would expose an invalid aggregate.
- Price is zero, negative, non-integer, outside safe transport range, or not
  IRR.
- Inventory action is zero, lacks a reason, is not authorized, would make a
  quantity negative, or reuses an idempotency key with different input.
- Media format, dimensions, alt text, focal point, or reference is invalid.
- Referenced Media is requested for deletion.
- Preview token or administration authorization is missing or invalid.
- Search query is too long, empty after normalization, or attempts to escape
  parameterized PostgreSQL search.
- Public slug or category does not exist, is draft/archived, or has no eligible
  published child data.
- Selected color does not belong to the requested Product.
- Media fails to load or partial catalog data is unavailable.
- A concurrent edit uses a stale resource version.
- A repeated publish or inventory command is replayed.
- Storefront copy overflows, clips, loses bidi isolation, or creates horizontal
  scrolling at an acceptance viewport.

## Verification evidence

- Domain tests for publication, lifecycle, money, and inventory invariants.
- PostgreSQL integration tests for persistence, constraints, idempotency,
  authorization, search, and publish-to-storefront visibility.
- OpenAPI validation, generated types, and request/response contract tests.
- Production builds for API, storefront, and administration applications.
- Playwright CLI snapshots, keyboard checks, responsive screenshots, and
  accessible state evidence in the documented output location.
- Updated requirements traceability, UI acceptance notes, migration impact,
  rollback notes, and a monitor-ready completion report.

## Schema and migration impact

Migration
`apps/api/prisma/migrations/20260731081128_milestone_2_catalog_vertical_slice/migration.sql`
adds the first catalog persistence version:

- Category, Product, ProductCategory, ColorVariant, MediaAsset and
  MediaAssignment ownership tables;
- SKU-scoped immutable PriceRecord and InventoryMovement facts with
  CurrentSkuPrice and Inventory projections;
- immutable BusinessEvent facts and replay-safe CommandReceipt records;
- uniqueness, quantity, focal-point, validity-window and one-current-price
  constraints;
- a PostgreSQL `simple`-configuration GIN index over normalized catalog search
  text.

The migration is additive and contains no production data rewrite. Development
rollback is destructive and therefore must only be performed on an explicitly
selected disposable database: remove the migration's tables/types in reverse
foreign-key order, then remove the migration record. Production rollback is
forward-only: archive/hide the new routes and deploy a compensating migration;
do not drop immutable price, inventory or event facts.

`STOREFRONT_ORIGIN` is documented for the administration preview proxy when
media contracts contain same-origin URI references. Production media may use
absolute CDN/object-storage URLs through the same contract.

Category hierarchy is intentionally not inferred. The frozen domain model
defines flat Category metadata, while the lower-priority draft CMS workflow
mentions an optional parent without cycle or deletion semantics. OQ-021 records
that conflict; this slice continues with flat Categories and stops only the
affected hierarchy behavior.

## Asset provenance and provisional typography

The only retained supplied font files are
`packages/design-system/assets/fonts/provisional/Elize-Regular.woff2` and
`PeydaWebVF.woff2`. The source folder's unused desktop, legacy and duplicate
files were moved to the Windows Recycle Bin and remain recoverable. These files
are implementation inputs, not frozen brand decisions.

The three linen-suit WebP assets under
`apps/storefront/public/media/catalog/` were generated as internal,
non-production prototypes. Their prompt direction was: isolated invisible
mannequin, premium beige boys' linen suit, warm ivory studio, soft side light,
no person/child/text/logo, consistent front/back/detail views. Final licensed
photography and the primary logo remain DES-003 and DES-001 respectively.
