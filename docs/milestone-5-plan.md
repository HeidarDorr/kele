# Milestone 5 implementation and acceptance plan

Status: In progress

Branch: `feat/m05-outfit`

Goal: a published immutable Outfit Revision can be discovered, selected by its
customer-facing Outfit size, resolved to exact component SKUs, added to a mixed
Cart, reserved and paid atomically, and rendered later from immutable Order
snapshots without synthetic Outfit inventory or silent revision replacement.

Rules in scope: PUB-001-PUB-004, PUB-009-PUB-011, PRC-004, PRC-006-PRC-007,
PRC-011-PRC-012, INV-001-INV-007, INV-015-INV-018, OTF-001-OTF-018,
CRT-001-CRT-018, ORD-001-ORD-004, ORD-018, SHP-006, SHP-008, EVT-001-EVT-007,
EVT-009, LOC-001-LOC-002, HRD-001-HRD-007, ADR-0003, and ADR-0004.

ADR-0003 is authoritative where the older Frozen domain wording describes one
Outfit-level price or OTF-006 forbids manual size definition. Milestone 5 uses
an explicit administrator-authored mapping for every Outfit Revision size and
stores its independent size price. The recorded source conflicts are tracked in
`open-questions.md` and do not block implementation.

## Acceptance criteria

### Authoring, revision identity, and publication

1. An Outfit owns stable commercial identity, slug, categories and lifecycle.
   Its composition and commercial presentation live in numbered revisions.
2. Creating an Outfit creates one mutable draft revision. Editing a draft may
   replace its items, editorial media, sizes, component mappings, prices and
   SEO fields under optimistic concurrency.
3. Publishing validates the complete draft and freezes it in the same
   transaction. No command or persistence adapter exposes an update or delete
   path for a published revision, item, size, component or media assignment.
4. Editing a published Outfit first forks a new draft from the published
   revision. Publishing that draft atomically makes it the current purchasable
   revision and marks the former revision historical without modifying any of
   its snapshot fields or child rows.
5. Publication requires a unique valid slug, at least one category, name,
   description, editorial media with one featured image, at least one item,
   and at least one complete supported size. The referenced Product,
   ColorVariant and SKU records must exist, be published, and have consistent
   ownership.
6. Validation returns stable rule IDs and field paths. Administration supports
   list, create/edit, validation, protected preview, publication, revision
   history and archive. Forged or missing catalog permissions fail closed.
7. Archiving removes an Outfit from public discovery and prevents new Cart or
   Checkout use while preserving every revision, Cart reference, Checkout
   snapshot and Order snapshot.

### Exact Outfit-size resolution

1. Each Outfit item selects exactly one Product, a default ColorVariant owned
   by that Product, a positive quantity and a deterministic display order.
2. Each supported Outfit size has a stable customer-facing code/label, a
   positive independent IRR price, and one or more exact component mappings.
3. Every component mapping identifies an Outfit item, an exact SKU owned by
   that item's Product and default ColorVariant, and a positive quantity. A
   SKU size string is not compared with the Outfit size code to infer a map.
4. For every Outfit size, component quantities must exactly cover every Outfit
   item quantity. Missing items, foreign variants, archived/unpublished SKUs,
   duplicate item mappings, zero quantities and extra components reject
   publication.
5. Resolution is deterministic by persisted item and component order and
   returns the immutable revision ID, selected Outfit size, configured price
   and exact component SKU quantities.

### Derived price and availability

1. The authoritative Outfit price is the configured price of the selected
   Outfit Revision size. Component Product price changes never change it.
2. Outfit stock is never persisted. For each selected size, available quantity
   equals the minimum of
   `floor(component SKU available quantity / required component quantity)`
   after aggregating repeated SKU demand.
3. SKU available quantity remains owned by Inventory and derived as physical
   minus reserved. Outfit code consumes the Inventory module's read and
   reservation contracts and does not duplicate stock mutation logic.
4. Public list price is the minimum current-revision size price. Public detail
   returns each size's current derived availability and quantity plus the
   constituent Product/default-variant presentation.

### Storefront discovery and detail

1. `/outfits` renders a useful server response for published current
   revisions, including deterministic empty, loading and dependency-error
   states. Cards are image-led, flat and consistent with the existing KELE
   storefront rather than generic ecommerce cards.
2. `/outfits/{slug}` renders breadcrumbs, editorial gallery, revision-backed
   name/description, independent size prices and availability, constituent
   Products with independent links, and an accessible add-to-Cart action.
3. Size controls preserve unavailable options as disabled, expose selected and
   focus states without relying on color alone, update price and availability,
   and announce meaningful state changes in Persian.
4. Customer pages retain `lang="fa-IR"`, `dir="rtl"`, logical CSS,
   centralized toman formatting, useful alternative text, reduced-motion
   behavior and bidirectional isolation for SKU/revision identifiers.
5. Mobile, tablet, small-laptop and desktop layouts have no horizontal
   overflow, preserve image focal points and keep a 44 CSS pixel practical
   minimum target. Loading, empty, error, disabled, unavailable,
   requires-review and success states are evidenced.

### Cart identity, merge, and review

1. An Outfit Cart line identity is the exact `(outfitRevisionId, outfitSize)`
   pair. Matching pairs may combine quantities; different revisions or sizes
   never combine.
2. Adding or updating an Outfit line re-resolves current price and derived
   availability but creates no reservation. Requested quantity is validated
   against every mapped component SKU.
3. Guest merge retains the exact referenced revision and size. It never
   substitutes the current revision. If the revision is superseded, archived,
   unpublished, incomplete or otherwise not purchasable, the line remains as
   `requires_review`, displays its historical identity and blocks Checkout.
4. A mixed Product/Outfit Cart calculates an informational total from current
   Product SKU prices and Outfit size prices. Checkout revalidates all lines
   and uses the same items subtotal for free-shipping eligibility.
5. The customer may remove or explicitly replace a review-blocked line through
   a new add/remove decision. No server command silently acknowledges or
   upgrades it.

### Atomic reservation, payment, and history

1. Checkout resolves every Outfit line to its exact revision-size component
   SKUs, multiplies component quantity by Cart quantity, aggregates total SKU
   demand across Product and Outfit lines, and locks Inventory rows in one
   deterministic order.
2. All Product and Outfit component reservations in one Checkout commit or
   roll back together. A failure leaves no Checkout, reservation, movement,
   quote or event fragment and never reserves only some Outfit components.
3. Reservation rows remain SKU-level and carry the parent Checkout line plus
   optional Outfit component context for audit. No Outfit inventory or
   synthetic Outfit SKU is created.
4. Verified payment consumes every component reservation exactly once through
   the Inventory-owning module and creates one Order under ADR-0004. Expiry,
   replay, reconciliation and callback idempotency retain Milestone 4
   guarantees for mixed carts.
5. Checkout and Order lines snapshot Outfit ID, revision ID/number, name,
   selected size, charged unit price, editorial media reference and exact
   component SKU code/product/color/size labels and quantities.
6. Historical reads use only Checkout/Order snapshots. Later Product price,
   label, media, stock, archive or Outfit revision changes cannot alter a paid
   Order response or customer rendering.

## Resolution examples

### Different garment sizes for one Outfit size

Revision `R7` has a jacket item using navy and a trouser item using black.
Outfit size `M` is explicitly mapped as follows:

| Outfit item   | Exact SKU     | SKU display size | Required quantity |
| ------------- | ------------- | ---------------- | ----------------: |
| Navy jacket   | `JKT-NAVY-40` | `40`             |                 1 |
| Black trouser | `TRS-BLK-42`  | `42`             |                 1 |

The Outfit size code `M` is not compared with `40` or `42`. Selecting `M`
always resolves revision `R7` to these two exact SKUs.

### Quantity-weighted availability

Outfit size `L` requires two units of SKU `TEE-WHT-L` and one unit of
`PNT-BLK-44`. Current Inventory availability is five and three respectively.
Derived Outfit availability is `min(floor(5 / 2), floor(3 / 1)) = 2`. Buying
quantity two reserves four tees and two trousers in the same transaction.

### Shared SKU demand in a mixed Cart

A Product line requests one `TEE-WHT-L`; an Outfit line quantity two requires
two of the same SKU per Outfit. Checkout aggregates demand to five before
locking. If only four are available, the entire Checkout fails and neither the
Product nor any Outfit component remains reserved.

### Revision history

Cart line `R7/M` remains `R7/M` after revision `R8` is published. It becomes
`requires_review`; it is never rewritten to `R8/M`. An Order already paid for
`R7/M` continues to show the R7 name, price, media and exact component labels
even if R8 changes all of them.

## Failure scenarios

| Failure                                                                                  | Expected outcome                                                                                      |
| ---------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Outfit has no item, category, editorial image or supported size                          | Validation returns stable rule/path errors; publication changes nothing                               |
| Item references unknown Product or a variant from another Product                        | Draft may be rejected on write or publication; no public revision                                     |
| Mapping omits an item, duplicates an item, uses a foreign/archived SKU or wrong quantity | Publication rejected; no partial frozen revision                                                      |
| Size has zero/negative price or component quantity                                       | Contract/domain validation rejection; no write                                                        |
| Attempt to update/delete any published revision child                                    | Conflict/forbidden result; persisted bytes and history unchanged                                      |
| Two administrators publish the same draft version                                        | Optimistic/transactional winner only; one current revision                                            |
| Component price changes                                                                  | Outfit size price remains unchanged; next read uses the configured Outfit price                       |
| Last component unit is contested                                                         | Exactly one checkout wins; loser has zero reservation fragments                                       |
| Later component fails after earlier locks/reservations                                   | Whole transaction rolls back, including all Inventory projections and movements                       |
| Same SKU appears in Product and Outfit lines                                             | Demand is aggregated before availability check; no double-count or oversell                           |
| Superseded/archived revision is added, merged or checked out                             | Line remains/enters `requires_review`; Checkout blocked; no substitution                              |
| Cart quantity exceeds derived Outfit availability                                        | Action rejected or capped only where an existing explicit merge rule permits it; customer is notified |
| Price or inventory changes between detail, Cart and Checkout                             | Checkout uses current server-owned revision price and Inventory; stale client data is ignored         |
| Reservation expires before verified success                                              | All component holds release once; payment success follows existing reconciliation path                |
| Duplicate or parallel success callback                                                   | One Order, one component deduction set and immutable identical snapshot                               |
| Product/Outfit/media changes after payment                                               | Historical Order response and rendering remain byte-equivalent for commercial snapshot fields         |
| Anonymous/foreign admin or customer resource access                                      | Fail closed without disclosing resource ownership or draft data                                       |

## Concurrency and immutability evidence

PostgreSQL integration tests must assert row counts and final values, not only
HTTP status, for: all size mappings; missing and invalid components; draft
fork/publication races; published-row mutation attempts; Product plus Outfit
mixed demand; last-unit contention; mid-reservation rollback; expiry versus
payment; parallel callback replay; Cart merge with superseded revision; and
Order snapshot reads before and after source catalog mutation.

For every reservation race, evidence includes Outfit/Checkout/Order count,
component reservation states, Inventory physical/reserved values,
InventoryMovement count, BusinessEvent count and absence of synthetic Outfit
stock.

## Migration and rollback plan

The schema change is additive: Outfit identity, immutable revision/item/media,
Outfit size and exact component mapping tables; Outfit Cart identity fields;
Checkout/Order Outfit snapshot and component snapshot tables or equivalent
immutable relational facts; supporting unique keys, checks and indexes.
Existing Product-only rows remain valid and require no destructive rewrite.

Development rollback may reverse the migration only while no Outfit revision,
Cart, Checkout or Order facts depend on it. Once published or commercial
Outfit facts exist, retain the schema, roll back application images, disable
new Outfit publication/purchase and preserve history until an explicitly
approved recovery migration is prepared.

## Planned acceptance evidence

- Unit: revision publication validator, explicit resolution and weighted
  derived availability.
- PostgreSQL integration: admin authoring/publication, revision immutability,
  discovery, Cart/merge, mixed checkout, atomic reservation, payment and
  immutable historical reads.
- Contract: OpenAPI lint/generation plus generated Outfit admin/public,
  Cart/Checkout and Order snapshot types.
- Browser: production-build customer and administration flows at 390x844,
  768x1024, 1280x800 and 1440x900, keyboard/focus, RTL, mixed-direction IDs,
  all required states and deterministic screenshots under
  `output/playwright/milestone-5/`.
- Gates: format, lint, strict type-check, unit, PostgreSQL integration,
  architecture, OpenAPI validation/generation/contract, all three production
  builds, end-to-end smoke, dependency audit, secret scan and migration status.
