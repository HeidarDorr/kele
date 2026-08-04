# Milestone 5 Outfit verification

Date: 2026-08-02

Status: complete locally on `feat/m05-outfit`; not pushed, merged or deployed.

## Delivered behavior

- An Outfit has stable identity and numbered Draft, Published and Historical
  revisions. Database guards reject update or deletion of a published or
  historical revision and its composition children.
- Every customer-facing Outfit size stores an explicit mapping from every
  revision item to one exact SKU. Resolution never compares display-size
  strings and never substitutes another revision or SKU.
- Price belongs to the revision size. Availability is calculated as the
  minimum weighted availability of the mapped component SKUs through the
  Catalog/Inventory application boundary; no Outfit inventory or synthetic
  Outfit SKU exists.
- Administration supports authoring, validation, protected preview,
  publication, archive and immutable revision history. Public Outfit listing
  and detail pages are server rendered and link each component independently.
- Cart identity is `(outfitRevisionId, outfitSize)`. Guest merge combines only
  an exact match and retains an old/non-purchasable revision as
  `requires_review`, blocking Checkout.
- Checkout aggregates SKU demand across Product and Outfit lines, locks the
  Inventory-owned SKU rows deterministically and creates every component
  reservation in one transaction. A missing last component rolls back all
  preceding reservations and Checkout facts.
- Verified payment consumes the complete component reservation set exactly
  once. The Order keeps immutable Outfit identity, revision, size, price,
  media and per-component SKU/name/color/size/quantity snapshots, which the
  customer Order page renders without querying current catalog composition.

## Rule coverage

The Milestone 5 touchpoints are PUB-001–PUB-004, PUB-009–PUB-011, PRC-004,
PRC-006–PRC-007, PRC-011–PRC-012, INV-001–INV-007, INV-015–INV-018,
OTF-001–OTF-018, CRT-001–CRT-018, ORD-001–ORD-004, ORD-018, SHP-006,
SHP-008, EVT-001–EVT-007, EVT-009, LOC-001–LOC-002 and HRD-001–HRD-007.
The detailed implementation-to-test mapping is in
`requirements-traceability.md`.

## Contract and data impact

- OpenAPI version `0.2.0` adds public Outfit discovery/detail, administrator
  authoring/validation/preview/history/publication/archive, exact Outfit Cart
  input and Checkout/Order component snapshot schemas. Generated TypeScript
  contracts are checked in.
- Migration `20260802112901_milestone_5_outfit` adds revision, item, size,
  exact mapping, media, Cart reference and Checkout/Order snapshot structures,
  constraints, immutable-row triggers and indexes.
- Migration `20260802140000_outfit_cart_identity` replaces the earlier
  per-revision Cart uniqueness with exact revision-plus-size identity.
- Both migrations are additive for commercial history. After Outfit facts
  exist, rollback means disabling new publication/purchase while retaining the
  schema and immutable history; destructive reversal needs separate approval.

## Automated evidence

| Gate                             | Result                                                                        |
| -------------------------------- | ----------------------------------------------------------------------------- |
| Format and lint                  | passed                                                                        |
| Strict TypeScript                | passed in all 7 workspace projects                                            |
| Unit                             | 42/42 passed across 11 files                                                  |
| PostgreSQL integration           | 22/22 passed across 5 files; 10 migrations current                            |
| Architecture                     | passed                                                                        |
| OpenAPI generation/validation    | passed; one pre-existing non-blocking missing tag-description warning remains |
| Contract                         | 2/2 passed                                                                    |
| Production builds                | API, storefront and administration passed                                     |
| Playwright production acceptance | 13/13 passed against isolated `kele_e2e` after a clean migration and seed     |
| Dependency/secret checks         | no known production vulnerability; no tracked secret match                    |

The concurrency suite proves that two carts competing for the last complete
two-component Outfit yield exactly one successful Checkout, no negative
inventory and no partial reservation. A forced failure after reserving the
first component leaves no Checkout, reservation, movement or business-event
fragment. Mixed Product/Outfit demand for a shared SKU is aggregated before
the availability check. Payment replay creates one Order and consumes the
complete component set once.

The 2026-08-04 dependency follow-up advances the workspace overrides to
`brace-expansion@5.0.9` and `postcss@8.5.23`. The regenerated pnpm lockfile is
compatible with the pinned Next.js, Vitest and ESLint toolchain, and
`corepack pnpm@11.18.0 audit` reports no known vulnerabilities.

## Browser evidence

Deterministic captures are stored in `output/playwright/milestone-5/` for:

- Outfit discovery plus loading, empty and error states;
- Outfit detail at 390×844, 768×1024, 1280×800 and 1440×900;
- administration listing at all four viewports, edit validation and protected
  preview;
- old revision `requires_review` Cart handling;
- an additional Playwright CLI production-page check at 1440×900.

The 24 changed Milestone 2–4 visual baselines were reviewed side by side and
refreshed because Milestone 5 intentionally extends the global storefront
navigation with Outfit discovery and the administration navigation with Outfit
authoring/history destinations. The underlying Milestone 2–4 page content and
states remain unchanged. During this review, the administration navigation was
made a contained two-column grid at the mobile breakpoint so its complete
wordmark and all four destinations remain inside the viewport. Outfit evidence
timestamps now use the fixed E2E clock/seed rather than the calendar date of the
test run.

The browser assertions cover `lang="fa-IR"`, `dir="rtl"`, keyboard skip-link
focus, useful server HTML, semantic names, disabled unavailable size,
mixed-direction identifiers, image readiness, reduced motion and absence of
horizontal overflow.

Cart evidence now renders the versioned editorial thumbnail directly instead
of relying on a responsive Next.js optimizer candidate. This removes the
hydration race that alternated between 1x and higher-density sources for
`cart-outfit-old-revision-review-laptop.png`; Playwright asserts the direct
source path, DPR, rendered width and sufficient decoded resolution before
capture. The affected Cart baselines were reviewed and refreshed together.

## Monitor-ready handoff

- Watch `GET /api/v1/health/live` and `GET /api/v1/health/ready` for process and
  dependency health.
- Alert on Outfit validation/publication errors, `requires_review` growth,
  Checkout component-resolution failures, reservation conflicts/expiry and
  payment reconciliation events using correlation IDs and immutable business
  events.
- Do not repair an old Cart by rewriting its revision. The supported recovery
  is customer review/removal and selection of the current published revision.
- No remote, production, credential, legal, price, shipping or return setting
  was changed.

## Known decisions and residual risk

- ADR-0003 is authoritative for independent Outfit-size prices and explicit
  administrator-authored size mappings. The older frozen wording conflicts are
  recorded as `SRC-M5-001` and `SRC-M5-002` in `open-questions.md`.
- The payment and SMS providers remain the accepted local/test fakes; production
  provider selection remains outside this milestone.
- OpenAPI validation is successful with one inherited warning for the
  `Admin Returns` tag description; it does not affect the Outfit contract.
