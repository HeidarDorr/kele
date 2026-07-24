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
