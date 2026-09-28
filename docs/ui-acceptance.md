# Visual references and UI acceptance

Version: 0.1
Status: Provisional
Last reviewed: 2026-09-05

## Reference inventory

| File | Dimensions | Interpreted scope |
|---|---:|---|
| `8801521299365830401_628684381880688.png` | 1536 × 1024 | Desktop homepage, upper portion |
| `2601805471311863553_628848043622709.png` | 864 × 1821 | Mobile homepage variants and open navigation |
| `-5845129624900264192_628138408302615.png` | 1024 × 1536 | Desktop product detail page |

These are aesthetic references, not pixel-perfect source files or approved
business copy.

## Extracted homepage behavior

- announcement strip above the main desktop navigation;
- logo-led, restrained navigation;
- large editorial hero with collection label, two actions and product image;
- four brand-value statements;
- occasion-led discovery;
- curated “New In” product row/grid;
- editorial detail module;
- newsletter prompt and dark footer;
- mobile drawer with navigation, account and orders. Wishlist and language
  switching shown in the reference are omitted in version 1.

Reference-only capabilities not included in version 1:

- wishlist;
- newsletter subscription;
- language switching;

Approved capabilities whose exact customer copy remains configurable:

- free-shipping threshold;
- Iran Post, Tipax and Tehran Local Courier;
- return requests within 24 hours after confirmed delivery.

Unapproved reference claims:

- exact free-shipping amount shown in the image;
- exact delivery timing promises;
- social networks.

Unapproved claims must not be copied into the product.

## Extracted product-detail behavior

- breadcrumbs;
- vertical thumbnail gallery and large primary image;
- image zoom affordance;
- label, name, price and short description;
- color swatches;
- size grid and size-guide link;
- Add to Bag control; wishlist is omitted in version 1;
- service reassurance block;
- description/details/size-and-fit/shipping-and-returns content;
- related-product carousel;
- full footer.

Missing states that implementation must design:

- unavailable color or size;
- low stock;
- price variation by size;
- loading and gallery error;
- no reviews and review errors;
- long Persian copy and RTL wrapping;
- product archived between load and cart action;
- authentication requirement;
- mobile product-detail layout.

### Product and Outfit purchase-panel amendment (2026-08-18)

- A Product or Outfit detail page displays exactly one prominent live price.
  Selecting a Product SKU or Outfit size updates that same price node in place;
  it must not append a secondary price below the options.
- Every Outfit card displays the lowest configured revision-size price. On an
  Outfit detail page, the first selected size is the first configured size at
  that lowest price, including when that size is currently unavailable.
- An Outfit has no Outfit-level color selector. Product color and exact SKU
  attributes may appear only as component facts after an Outfit size is
  selected.
- The Outfit purchase panel presents every real component inside the
  component-option group. Each row shows responsive Product imagery, name and
  selected-color facts, and links independently to the exact Product and
  ColorVariant without activating its adjacent inclusion control. One or two
  components must not create reserved empty tracks or placeholder surfaces.
- The Outfit page does not repeat those components in a lower composition box.
  The lower discovery area uses the same related-product structure and states
  as a Product detail page and excludes the Outfit's constituent Products.
- Unavailable sizes remain perceivable without relying on color alone, retain
  keyboard semantics, and cannot result in an invalid Add-to-Cart command.

- A complete Outfit is added as one Outfit Cart line at its independent
  revision-size price. If the customer removes any component, the selection is
  no longer sold or labelled as an Outfit: the prominent price becomes the sum
  of the remaining exact SKU prices and those SKUs are added atomically as
  independent Product Cart lines.
- Cart, Checkout, Order and return surfaces continue to show a partial
  selection as independent Products. They must never synthesize a modified
  Outfit, an exclusion label, or an Outfit-derived price for that selection.

Failure cases include a card or initial Outfit selection using API display order
instead of the lowest revision-size price, duplicate prices after a selection,
an empty color group on an Outfit page, a missing or incorrect component Product
link, link activation that changes the inclusion control, repeated component
composition below the purchase panel, a related result containing a constituent
Product, stale availability after an underlying SKU change, and an enabled
purchase action without a valid exact SKU mapping. Partial insertion of only
some remaining Products and representing a partial selection as an Outfit are
also failures.

### Product gallery amendment (2026-08-28)

- Product detail exposes every image assigned to every published ColorVariant,
  preserving ColorVariant order and gallery assignment order.
- Selecting a color changes the purchasable variant and opens that color's
  featured image, but images from the other colors remain reachable in the same
  gallery.
- On mobile, a horizontal touch gesture over the primary image moves to the
  previous or next image with RTL semantics. Previous and next transitions use
  mirrored horizontal motion. A vertical gesture continues to scroll the page,
  and thumbnails remain available to touch and keyboard users.

### Product information amendment (2026-08-28)

- The Product information band preserves the supplied description and detail
  strings without introducing inferred material, care, fit or quality claims.
- At the mobile acceptance width, the band is a single-column, full-bleed warm
  surface with two numbered editorial headings and divided detail rows. The
  description and detail list use a controlled offset without horizontal
  overflow or text clipping.
- Section and row numbers are decorative and hidden from assistive technology;
  the semantic headings, paragraph and list retain the complete reading order.
- A Product without detail rows renders the description only and does not leave
  an empty second column or list.

### Route loading amendment (2026-09-05)

- Every Storefront page has an App Router loading boundary. A closer segment
  boundary may provide route-specific geometry; otherwise the root boundary
  covers the route, including Homepage and Occasion pages.
- Loading uses the existing warm, layout-shaped skeleton language. The reserved
  image, heading, copy and card geometry should resemble the destination page
  closely enough to prevent a blank or apparently unresponsive transition.
- One named status region exposes `role="status"` and `aria-busy="true"` while
  skeleton blocks remain hidden from the accessibility tree. Reduced-motion
  mode removes their sweep without removing the reserved geometry.

Failure cases are a file-backed page with no reachable boundary, blank content
during a delayed navigation, a text-only or visually unrelated loading panel,
multiple competing live announcements, visible skeleton labels, horizontal
overflow, and animation that persists under reduced motion.

### Typography-scale amendment (2026-09-05)

The Estedad/Vazirmatn review must use the role scale in `design-system.md`:
Display XL is 40/44 on mobile and 64/68 on desktop, Display L is 32/38 and
44/50, and Heading M is 24/30 and 28/34. Homepage and Outfit mastheads use
Display XL; page and Product titles use Display L; section headings use Heading
M. Body, UI and caption text remain 16, 14 and 12 pixels respectively unless a
component has an approved accessibility reason to differ.

Acceptance checks computed size, line height, family and overflow at 390, 768,
1280 and 1440 pixels across Homepage, catalog, Product, Outfit, Occasion,
Journal, commerce-state and Administration page families. A legacy oversized
page-specific clamp, clipped Persian title, heading-role inversion, body copy
reduced below its role, or horizontal overflow fails acceptance.

## Acceptance viewports

Capture deterministic screenshots at:

- 390 × 844
- 768 × 1024
- 1280 × 800
- 1440 × 900

Additional content-driven widths are tested whenever a component changes
layout.

## Visual acceptance method

1. Use deterministic seed data and the approved reference asset set.
2. Capture production-build screenshots with animations disabled.
3. Compare composition, hierarchy, spacing, typography, crop, color, and
   interaction states.
4. Automated pixel diff is a signal, not the sole acceptance method; font
   rendering may vary.
5. Record intentional deviations in the PR.

Critical tolerances after final design assets exist:

- no visible layout shift from image/font loading;
- repeated grid alignment within 4 px;
- major container and hero alignment within 8 px;
- no clipped text, accidental wrapping or horizontal overflow;
- image focal subject remains intact at all acceptance viewports;
- interactive target is at least 44 × 44 CSS px where practical;
- visible keyboard focus and no critical automated accessibility issue.

## Page acceptance checklist

Every page includes:

- default, loading, empty, error and partial-data behavior;
- mobile/tablet/desktop composition;
- keyboard and screen-reader names;
- authenticated/unauthenticated behavior where relevant;
- unavailable/disabled behavior;
- SEO title, description, canonical and social metadata for public pages;
- analytics events only after consent policy is approved;
- approved copy and price/currency formatting.

## RTL acceptance

- Root language is `fa-IR` and document direction is RTL.
- Reading order, keyboard order, drawer origin, breadcrumbs, gallery controls,
  carousels and directional icons follow RTL semantics.
- Mixed Persian/Latin content, SKU codes, mobile numbers and order identifiers
  remain legible using explicit bidi isolation where necessary.
- Internal values remain IRR; customer-facing prices use one approved toman
  formatter and label.

## Assets still required

- final, production-approved primary/monochrome SVG variants and favicon; the
  supplied signature PNG is only a temporary in-product review placeholder;
- licensed web fonts;
- final product/editorial imagery, including the Homepage images specified in
  `apps/storefront/lib/art-direction.ts` (DES-007);
- icon source or approved icon family;
- complete UI flows for listing, search, cart, checkout, account, Journal and
  administration;
- legal and operational copy, including the Homepage brand copy under DES-006.

## Homepage redesign acceptance

The Homepage composition, section order and slot behavior are specified in
`docs/design-system.md`. This section records what has to hold before the page
is accepted.

Structure:

- exactly one `h1`, supplied by the hero;
- every section labelled by its own heading through `aria-labelledby`;
- published CMS sections render in their published order, and the brand-owned
  sections appear at their anchored positions;
- when the published Homepage is unreadable the brand-owned sections still
  render, the page says the published narrative is unavailable, and the
  catalogue stays reachable.

Layout, verified at 390×844, 768×1024, 1280×800 and 1440×900 under `dir="rtl"`:

- no horizontal overflow at any acceptance viewport;
- the hero is edge to edge at every viewport, and its copy never sits on
  unprotected photography;
- curated rails scroll inline without trapping page scroll, and read correctly
  with a single item;
- the closing band's solid action stays visible on the inverse surface.

Content states, each required before the page is complete:

- missing artwork reserves its exact geometry and states its brief outside
  production, or the unavailable state inside production;
- an empty curation states that nothing is published rather than rendering an
  empty rail;
- a single occasion and a single journal article each compose deliberately
  instead of leaving empty grid tracks;
- each featured set renders as its own spread with its piece count, starting
  price, availability and action, and an unavailable set says so instead of
  hiding; a third gallery image adds a scene frame, and mirrored spreads keep
  the images in the wider column;
- reduced-motion mode removes the image reveals and the loading sweep.

The redesign supersedes the previous Homepage baselines. Route baselines under
`e2e/milestone-8.spec.ts-snapshots/` must be regenerated and re-approved before
the page can be treated as a stable visual contract; until then DES-004 covers
them.

## Milestone 7 editorial acceptance

The approved KELE visual language is extrapolated to Homepage, Journal and
Occasion routes without treating screenshot copy as business policy. The
implementation uses a warm ivory canvas, large editorial Persian display type,
asymmetric image-led compositions, thin dividers and a dark footer. It does not
introduce cards-within-cards, gradients as decoration, dark mode, Wishlist or
Newsletter.

Three generated development assets provide reviewable composition while
DES-003 final art direction remains open:

- `apps/storefront/public/media/editorial/homepage-hero.webp`;
- `apps/storefront/public/media/editorial/occasion-formal.webp`;
- `apps/storefront/public/media/editorial/journal-tailoring.webp`.

They are implementation prototypes, not final customer-approved campaign
imagery or approval of any legal, shipping, pricing or returns claim.

Playwright CLI evidence is stored in `output/playwright/milestone-7/` for
customer Homepage at 360 × 800, 768 × 1024, 1280 × 800 and 1440 × 900; Journal
at mobile/desktop; Occasion at tablet; and Homepage editor, Journal editor and
Media-reference administration. The repeatable production-build suite is
`e2e/editorial.spec.ts`. Gate-time captures are written below the ignored
`output/playwright/.e2e-run/milestone-7/` root, so reviewing Milestone 7 cannot
rewrite accepted evidence from an earlier milestone.

Acceptance covers `fa-IR`/RTL roots, responsive overflow, keyboard skip-link,
semantic headings/navigation, descriptive image alternatives, reduced motion,
SEO title/description/canonical/Open Graph/Article JSON-LD, Draft/public
isolation, protected previews, immediate post-publication reads, loading,
empty, error, disabled and success states, and zero browser console errors.
The repeatable state matrix includes Homepage loading/unavailable; Journal
loading/empty/error/success; Occasion index loading/empty/error/success;
Occasion detail unavailable; and administration loading/error/empty,
referenced-Media deletion disabled, and successful Homepage, Journal,
discovery and Site Settings routes. Relevant states are captured across
390x844, 768x1024, 1280x800 and 1440x900 viewports with overflow assertions.

Journal detail acceptance requires exactly one document-wide
`script[type="application/ld+json"]` whose parsed `@type` is `Article`. The
assertion is repeated after client navigation and a full reload; a locator
shortcut must not hide duplicate structured data.

The Milestone 6 fulfillment regression is also guarded in the full suite. Each
Server Action redirects to a transition-specific completion URL, its submit
control remains disabled while pending, and the final customer-service API
read must report `fulfillmentStatus=delivered` with `version=4`.

## Milestone 1 shell evidence

Milestone 1 supplies only static storefront and administration shells, not a
data-backed customer or operational workflow. Reviewable production-build
captures are maintained in `output/playwright/milestone-1/` for desktop
(1440 × 900), small laptop (1280 × 800), tablet (768 × 1024), and mobile
(390 × 844).

Loading, empty, error, unavailable, disabled, and success states are therefore
not applicable to the static M1 shell: it neither fetches domain data nor
accepts a user command. Artificially rendering those states here would create
fake behavior. The M1 smoke evidence instead proves the meaningful shell
conditions (successful static render, `fa-IR`, RTL, mixed-direction identifiers
and responsive viewport rendering). The state matrix becomes mandatory as soon
as Milestone 2 introduces the first catalog/admin data flow.

## Milestone 2 catalog vertical slice

Milestone 2 establishes one coherent, provisional KELE storefront language for
the supplied homepage and product-detail references:

- warm ivory canvas, dark brown ink, thin dividers and near-flat surfaces;
- the page theme is deliberately light; the dark footer follows the approved
  reference structure and is not an alternate theme. Automatic dark-mode
  palette changes remain unapproved and are not inferred;
- editorial, image-led compositions rather than generic cards;
- the temporary default `estedad-vazirmatn` review pairing loads Estedad locally
  for headings and Vazirmatn for body text, controls, labels and prices in both
  Storefront and Administration; heading roles preserve their component
  hierarchy, mostly weight 400 with selected headings at 500, while body text is
  400 and emphasized controls or prices use 500–600;
- explicit `elize` and `markazi` settings retain the legacy review choices for
  rollback; see `design-system.md` for their family mapping and restart steps;
- the existing customer-supplied signature image is the wordmark in every
  variant; typography selection does not replace it with typed text or approve
  the final logo;
- the new pair's official upstream provenance and OFL files are recorded under
  `packages/design-system/assets/fonts/open-source/`; the temporary selection
  does not close DES-002 final brand sign-off or approve customer-facing claims;
- browser acceptance verifies the selected real font faces finish loading,
  headings use the display family, and body/control/label/price text uses the
  body family rather than relying on CSS declarations alone;
- desktop product detail uses a large focal-point-aware gallery beside product
  information; mobile places the gallery first and keeps thumbnails reachable;
- unavailable Product sizes remain visible and disabled. An unavailable Outfit
  size may remain selectable only to expose the OTF-019 component-omission path;
  the full Outfit purchase action remains blocked while any required component
  is unavailable;
- the administration surface favors explicit labeled forms, validation output
  and ledger actions over compressed dashboard cards;
- cart, checkout, Wishlist, Newsletter, language switching and unapproved
  shipping/returns copy are deliberately absent.

The catalog page supports deterministic visual-review states at
`?state=loading`, `?state=empty`, and `?state=error`. These parameters only
select presentation fixtures for browser acceptance; they do not alter domain
or API behavior.

Production-build evidence is stored in
`output/playwright/milestone-2/`. It includes:

- storefront home with visible keyboard focus;
- product detail at 390 × 844, 768 × 1024, 1280 × 800 and 1440 × 900;
- administration at the same four representative viewports;
- loading, empty and error catalog states;
- independent Playwright CLI captures for gallery interaction and mobile
  composition.

The random aggregate created by the publish-path E2E test is deleted before
visual capture. Versioned screenshots therefore contain only deterministic seed
data. Browser checks also require every product/preview image to finish decoding
with a positive natural width; the acceptance run must emit no Next
image-validity warning.

The Elize evidence remains under `output/playwright/milestone-2/`. Equivalent
E2E Markazi-review captures are written to
`output/playwright/milestone-2-markazi/`. Capture the current pairing in its own
typography evidence directory so that one variant does not overwrite another.
The typography checks in `e2e/foundation.spec.ts` cover Storefront and
Administration and must be rerun for the selected pair before recording a pass.

For the 2026-09-05 temporary pairing, acceptance at widths 390, 768, 1280 and
1440 pixels requires readable Persian headings and mixed-direction identifiers,
no clipped text or horizontal overflow, unchanged artwork, and unchanged
loading, empty, error, disabled, unavailable and success behavior. Missing font
assets, fallback-only rendering, a display face on prices or labels, clipped
heading lines and an altered signature image fail acceptance. Check the loaded
families after `document.fonts.ready` and retain visual evidence of the
representative Storefront and Administration page families at each width.
Heading size, weight and line height may be adjusted to the new family without
changing business behavior.

Generated linen-suit images are internal prototype assets used only to make
layout, crop, focal-point and responsive acceptance objective. They do not
resolve DES-003 and must be replaced before production use.

## Milestone 3 customer and cart vertical slice

The customer experience extends the established quiet editorial language
without dashboard styling: sign-in is a focused OTP panel; the account page
uses numbered profile/address sections; cart content remains image-led with a
flat summary surface and thin semantic state bands.

Production-build evidence in `output/playwright/milestone-3/` includes:

- authenticated cart at mobile, tablet and desktop plus the 1280 x 800 merge
  notice state;
- completed profile and strictly owned default address at desktop;
- mobile empty, laptop loading and tablet dependency-error states;
- desktop unavailable Product and exact Outfit Revision `requires_review`
  blockers.

The suite asserts `lang="fa-IR"`, `dir="rtl"`, mixed-direction mobile/SKU
values, no horizontal overflow and keyboard Escape for the modal cart drawer.
Controls expose disabled/busy states, announcements use status/alert live
regions, and unavailable or review lines remain editable/removable while the
cart reports that continuation is blocked. No checkout control is rendered in
Milestone 3.

## Milestone 6 operations and customer-service evidence

The operations surface extends the restrained catalogue administration language
with flat work queues, explicit reasons, versioned tracking, status text and an
append-only timeline. It avoids inferring permissions from hidden or disabled
controls; the API remains authoritative.

The customer Order list/detail preserves the editorial storefront language.
Tracking is mixed-direction isolated, return eligibility states the recorded
deadline, all three condition declarations are explicit and submission copy
does not imply approval or refund success.

Production-build evidence in `output/playwright/milestone-6/` includes delivered
staff Order detail, searchable audit results, submitted and completed customer
return states, and mobile empty/error operations states. Playwright asserts
390×844 and 1280×800 layouts, `lang="fa-IR"`, `dir="rtl"`, reduced motion,
semantic labels/live regions and no horizontal overflow. The CLI capture
independently confirms the mobile semantic tree and document direction.

## Milestone 8 storefront experience and visual fidelity

The pre-edit route/state/viewport audit and measurable contract are recorded in
`docs/milestone-8-storefront-acceptance.md`. The completed system covers 19
version-1 customer routes at 390×844, 768×1024, 1280×800 and 1440×900, producing
76 stable full-page baselines with a one-percent maximum pixel-difference
threshold. The independent comparison run passed all 14 M8 Playwright tests
without updating those baselines.

The route matrix covers Homepage, Catalog, Search, Category, Product, Outfit
index/detail, Occasion index/detail, Journal index/article, Sign-in, Cart,
Checkout, Account, Order list/detail, Fake Payment and Payment Result. Twenty
token-authenticated fixture states cover slow/loading, empty/no-data and
server/dependency failure; public query parameters cannot activate them;
Cart client failure adds the twenty-first failure state. Separate captures prove
mobile menu focus return and a successful owned Return submission.

Objective assertions require one `main` and one visible `h1`, `lang="fa-IR"`,
`dir="rtl"`, decoded images, zero horizontal overflow and zero browser-console
errors on every matrix route. Keyboard tests cover Tab order, modal containment,
Escape and opener focus restoration. Reduced-motion and representative Persian
content mixed with mobile, postal, SKU, Order and payment identifiers are
verified. Axe reports zero critical or serious WCAG 2.2 AA violations on
Homepage, Catalog, PDP, Cart and Checkout; visible buttons in that scan meet the
44×44 px target rule.

Evidence is split intentionally:

- stable comparisons: `e2e/milestone-8.spec.ts-snapshots/`;
- reviewable route/state captures: `output/playwright/milestone-8/`;
- machine-readable scan/timing observations:
  `output/playwright/milestone-8/accessibility.json` and
  `output/playwright/milestone-8/performance-observations.json`.

The local production-build timing observations are diagnostic, not a production
network certification: measured `load` was 36–105 ms for the five sampled
routes. Final CDN, final Media and real-user performance remain Milestone 9.
DES-001 through DES-005 retain the provisional fallbacks and launch-blocker
status recorded in `docs/open-questions.md`; M8 implementation does not imply
asset, font, extrapolation or breakpoint approval.

## Product navigation and responsive menu evidence

The production Storefront build was reviewed at 390×844, 768×1024 and
1440×900. The review confirmed `lang="fa-IR"`, RTL direction and zero
horizontal overflow at every viewport. On desktop, hovering Product reveals
the eight approved groups and the current Product route exposes an active
state. Below the 1024 px desktop boundary, the opaque overlay covers the exact
viewport and both its entry and exit use the paired `kele-panel-fade-in` /
`kele-panel-fade-out` animations without backdrop blur or directional motion,
while the
Product disclosure lists Set, Jacket, Trousers, Shirt, T-shirt, Vest, Shorts
and Shoes without the former Category block. The 2026-09-06 follow-up replaces
the text-only disclosure with the supplied WebP line illustrations, removes all
decorative group numbering, and gives the desktop panel a physical-left
editorial image beside a four-by-two RTL group grid. Drawer links remain
underline-free.
At 390 px the first row of the four-item Homepage promise grid starts without a
top divider or top padding, and each Occasion index image occupies the complete
single-column article width. Reduced-motion removes the new animations.

Catalog group cards use the supplied 3:1 WebP backgrounds with text kept in the
image's open area and the garment focal point kept visible. They render in one
column below 640 px and two columns at and above 640 px. The unfiltered Catalog
also includes published Outfit cards alongside Product cards while preserving
the independent `/outfits/[slug]` route and Outfit minimum-price projection.
Responsive evidence is retained in
`output/playwright/product-discovery-redesign/` for 390×844, 768×1024,
1280×800 and 1440×900.

Data-backed card rendering and authenticated Admin Product/Media form replay
were completed against the deterministic PostgreSQL seed. The Product creation
journey selects Media through the new checkbox/featured-image controls, creates
the SKU price and publishes the Product to the Storefront. Updated visual
baselines and the WCAG critical/serious plus 44×44 target-size gate pass across
the acceptance viewports.
