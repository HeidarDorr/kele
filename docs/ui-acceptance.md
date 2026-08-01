# Visual references and UI acceptance

Version: 0.1
Status: Provisional
Last reviewed: 2026-07-24

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

- logo SVG variants and favicon;
- licensed web fonts;
- final product/editorial imagery;
- icon source or approved icon family;
- complete UI flows for listing, search, cart, checkout, account, Journal and
  administration;
- legal and operational copy.

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
- Elize is loaded locally for storefront display headings in the default
  review variant and the typed wordmark stand-in; this is not approval of
  either the font or a final logo;
- the optional Markazi review variant uses Markazi Text for display headings
  while retaining Peyda for text; in that variant the visible wordmark is
  Persian `کله` rendered with Elize in the storefront and administration app;
- Peyda is loaded locally for body, control and administration text; it also
  remains a provisional, non-frozen choice;
- browser acceptance checks computed body/control families for Peyda, the
  selected display family for headings, and Elize for the wordmark rather than
  relying on CSS declarations alone;
- desktop product detail uses a large focal-point-aware gallery beside product
  information; mobile places the gallery first and keeps thumbnails reachable;
- unavailable sizes remain visible and disabled so stock state is clear without
  implying cart behavior;
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
`output/playwright/milestone-2-markazi/`, preventing one typography variant
from overwriting the other.

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
