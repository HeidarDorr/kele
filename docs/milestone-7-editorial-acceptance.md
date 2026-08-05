# Milestone 7 editorial acceptance contract

Status: Implementation contract for `feat/m07-editorial-platform`

## Scope and source resolution

Milestone 7 adds a typed editorial platform for Homepage, Journal, Category
and Occasion discovery, reusable Media, and versioned Site Settings. The
explicit Milestone 7 brief requires Homepage draft/published isolation,
protected preview, and publication. This replaces the older immediate-save
wording in draft rule CMS-006 and the draft CMS workflow. No accepted ADR or
Frozen requirement is changed.

Journal scheduling is not implemented. No current rule defines scheduling,
timezone, cancellation, retry, or failure behavior. Publication is an explicit
authorized command and is immediately visible without deployment.

Wishlist and Newsletter remain excluded by SCP-001 and SCP-002.

## Roles and permissions

- Public customers may read only current published Homepage, Journal,
  discovery and Site Settings projections.
- Only `super_admin` may list or mutate editorial drafts, open previews,
  publish/archive content, inspect Media references, delete unreferenced Media,
  or publish Site Settings (CMS-003).
- `inventory_admin` and `instagram_admin` receive `403` for every editorial
  administration route. Authentication and authorization are enforced by the
  API, not by hidden controls.
- Every accepted mutation appends a safe Business Event with actor, entity,
  correlation identifier and non-secret change metadata (CMS-017, EVT-001 to
  EVT-004, EVT-008).

## Content lifecycle

### Homepage

- A saved draft is never returned by the public Homepage endpoint.
- Preview reads the current draft through a protected administration route.
- Homepage sections are an ordered discriminated union. Supported types are
  `hero`, `editorial_banner`, `featured_products`, `featured_outfits`,
  `occasion_grid`, `journal_highlights`, and `brand_story`.
- Publication validates the entire draft, atomically replaces the public
  pointer, retains the preceding published revision as history, and triggers
  cache revalidation without an operator refresh (PUB-002, PUB-003, PUB-010,
  PUB-011, CMS-006, CMS-007).
- Empty or disabled optional sections may remain in a draft. A publishable
  Homepage must contain exactly one enabled Hero with valid referenced Media.

### Journal

- Article identity owns a unique normalized slug. Draft edits do not modify
  the latest published snapshot.
- Content uses only typed blocks: heading, paragraph, quote, ordered or
  unordered list, image, Product reference, Outfit reference, external link,
  and divider. Arbitrary HTML, script, style, iframe and unsafe URL schemes are
  rejected at the API boundary.
- Publication requires Persian title, slug, excerpt, cover Media, non-empty
  content, SEO title and SEO description. All referenced Media and catalog
  objects must exist. The published snapshot becomes public immediately.
- Preview is protected. Archive removes the public route while preserving
  drafts, publications, references and audit history (PUB-001 to PUB-004,
  CMS-011, CMS-013).

### Category and Occasion discovery

- Existing flat Category ownership remains unchanged; no parent hierarchy is
  introduced (OQ-021, CAT-002, CAT-003).
- A Category may be presented as `catalog` or `occasion` discovery. Editors
  control Persian editorial title/description, Hero Media, SEO metadata and
  display order. Public Occasion navigation contains only published Occasion
  entries.
- Slugs are unique across Category identities. A conflict rejects the command
  and does not alter the existing category.

### Site Settings

- Site Settings are typed, append-only versions with one current published
  projection and immutable history. A draft may change without affecting the
  public storefront.
- Version 1 settings cover brand identity text, approved navigation/footer
  links, contact channels, SEO defaults, and an optional announcement.
  Shipping configuration remains owned by its existing versioned Checkout
  contract.
- Announcement or footer content classified as `legal`, `pricing`,
  `shipping`, or `returns` cannot publish unless the draft records an explicit
  approver and approval timestamp. Draft saving remains allowed so approval can
  be obtained without losing work.

## Media safety

- Before deletion, the API reports every active Product, Outfit, Homepage,
  Journal, Category/Occasion and Site Settings usage location (CMS-016).
- A referenced Media asset cannot be permanently deleted and returns a
  conflict containing safe usage locations. No cascade or silent substitution
  is allowed.
- An unreferenced asset may be deleted only by `super_admin`; the deletion and
  prior safe metadata are audited. Historical published editorial references
  count as active retention references.

## Acceptance and failure cases

1. Saving a draft leaves anonymous public responses byte-equivalent in content
   and cache identity until publication.
2. Anonymous, Inventory Admin and Instagram Admin preview attempts fail without
   revealing draft content.
3. Duplicate Journal or Category slugs return `409`; the original resource and
   publication remain unchanged.
4. Missing Hero/cover Media, archived Media, invalid internal references,
   unsafe links, empty required copy and unsupported section/block types reject
   publication with field-specific errors.
5. Referenced Media deletion returns `409` and every reference remains intact;
   unreferenced deletion removes only that Media record and appends an event.
6. Publishing is transactional: validation failure or concurrent version
   mismatch leaves the prior published projection and cache tag unchanged.
7. Public Homepage, Journal index/detail, Category and Occasion pages render
   useful server HTML with Persian RTL metadata, canonical URL, Open Graph
   fields, useful image alt text and no draft identifiers.
8. A publish/archive/settings command changes the relevant cache version so a
   subsequent storefront read observes the new projection without deployment
   or manual refresh.
9. Audit history reconstructs draft save, preview-safe read metadata,
   publication, archive, settings version and Media deletion operations without
   storing unsafe Journal markup or sensitive approval notes.
10. Browser acceptance covers 390x844, 768x1024, 1280x800 and 1440x900,
    keyboard focus/order, mixed-direction identifiers, reduced motion, no
    horizontal overflow, and loading, empty, error, disabled and success states.

## Operational impact

- The migration is additive. Rollback requires first returning application
  traffic to the Milestone 6 schema contract, then dropping only Milestone 7
  tables/columns if no editorial data must be retained.
- Prototype editorial imagery is non-production evidence and does not close
  DES-003. Final logo, fonts, Journal/CMS approval and customer-visible legal,
  price, shipping and return copy remain launch dependencies.
