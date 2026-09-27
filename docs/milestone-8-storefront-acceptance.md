# Milestone 8 storefront audit and visual acceptance contract

Status: Implementation contract for `feat/m08-storefront-visual-fidelity`

## Objective and boundaries

Complete and objectively verify the entire KELE version-1 storefront and
customer experience across desktop, tablet and mobile, matching supplied
references and approved extrapolations without changing business behavior.

Milestone 8 may refine presentation, shared frontend structure, fixtures and
browser evidence. It does not change API contracts, persistence, authorization,
commerce calculations, route slugs, customer-visible legal policy or accepted
business rules. Wishlist, Newsletter, multilingual UI and automatic dark mode
remain outside version 1 under SCP-001, SCP-002, LOC-001 and the accepted
Milestone 2 UI direction.

## Design read

This is a targeted evolution of a Persian premium children's fashion
storefront for parents who value imagery, trust and calm decision-making.
The visual language is editorial, warm, image-led and near-flat, using the KELE
token and typography system rather than a general-purpose component theme.

- `DESIGN_VARIANCE: 6`: controlled asymmetry on discovery pages, strict
  single-column collapse below 768 px and predictable commerce layouts.
- `MOTION_INTENSITY: 3`: state feedback, menu/drawer transitions and image
  selection only. No scroll hijacking, perpetual motion or decorative effects.
- `VISUAL_DENSITY: 3`: generous section rhythm, product imagery as the primary
  surface and compact controls only where the buying workflow requires them.
- Shape rule: square or 2-4 px corners, with circular treatment reserved for
  semantic swatches and status symbols.
- Theme rule: the approved light KELE canvas is page-wide. The dark footer is a
  reference-defined inverse surface, not an alternate color theme.

The warm ivory, burnt-orange and restrained Persian display direction is not an inferred
premium-consumer default. It is explicitly required by `design-system.md` and
the supplied KELE references, so it overrides the generic anti-default guidance
in the visual-design skill.

## Supplied reference audit

| Reference                                  | Original dimensions | Accepted visual evidence                                                                                                  | Excluded inference                                        |
| ------------------------------------------ | ------------------: | ------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| `8801521299365830401_628684381880688.png`  |         1536 x 1024 | calm desktop Homepage, broad hero, low-density navigation, occasion imagery, editorial product row                        | English copy, social links, exact offer claims            |
| `2601805471311863553_628848043622709.png`  |          864 x 1821 | stacked mobile Homepage, off-canvas navigation, readable image-led sections, compact footer groups                        | Wishlist, language switcher, Newsletter                   |
| `-5845129624900264192_628138408302615.png` |         1024 x 1536 | desktop PDP gallery rail, dominant portrait image, anchored purchase panel, explicit variants/sizes and related discovery | exact shipping amount, return duration, reviews, Wishlist |

All three files were inspected at original resolution before implementation.
They govern presentation only. Approved business copy remains server-owned or
configuration-owned.

## Existing route audit

The audit covered every file-backed Storefront route, all shared customer
components and the existing Milestone 1-7 browser evidence before code edits.

| Route                     | Existing states and journeys                                                                                                | Current visual/UX gap to close                                                                                                         | Required M8 acceptance                                                                                                                         |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `/`                       | published, loading fixture, unavailable fixture                                                                             | decorative section numbering/scroll cue, incomplete supported section coverage, hero treatment diverges from light reference direction | light image-led hero, all supported sections, resilient partial data, mobile menu journey and route-transition skeleton                        |
| `/catalog`                | success, `q`, sort, loading, empty, error                                                                                   | search is visually fused into a utility form; no active-query context; grid rhythm and mobile controls need refinement                 | search/no-results journey, deterministic sort, 2/3/4-column responsive grid, retained input on failure                                         |
| `/category/[slug]`        | success, empty, not found                                                                                                   | no route loading treatment or dependency-error fixture; presentation repeats generic catalog masthead                                  | editorial PLP heading, empty/error/loading evidence, category navigation                                                                       |
| `/products/[slug]`        | success, color query, gallery selection, size unavailable, loading, not found, image fallback                               | missing service/content disclosures and related discovery; gallery does not expose position/status; mobile purchase path is long       | close PDP composition match, keyboard gallery, color/size/price state, unavailable and image-error evidence, related products without Wishlist |
| `/outfits`                | success, loading, empty, error                                                                                              | very large masthead, decorative revision metadata, status overlay on imagery                                                           | consistent discovery masthead, stable 1/2-column layout and full state set                                                                     |
| `/outfits/[slug]`         | success, size unavailable, loading, not found                                                                               | decorative middle-dot metadata and revision label; component grid lacks compact mobile hierarchy                                       | exact-revision copy, size/availability, image-backed exact Product links in component options and related-product discovery                    |
| `/occasions`              | success, loading, empty, error                                                                                              | numbered editorial rows and excessive alternating treatment                                                                            | calm image-led index, deterministic responsive collapse, state evidence and route-transition skeleton                                          |
| `/occasion/[slug]`        | success, unavailable fixture, not found                                                                                     | missing explicit dependency-error/loading evidence                                                                                     | hero focal point, product availability/empty state, navigation and metadata                                                                    |
| `/journal`                | success, loading, empty, error                                                                                              | good M7 foundation; heading rhythm and card crop need system alignment                                                                 | retained Article discovery hierarchy across all viewports                                                                                      |
| `/journal/[slug]`         | success, not found, mixed block types                                                                                       | Product/Outfit references navigate only to indexes; eager inline images; no block-level missing-media feedback                         | one Article JSON-LD object, readable prose, safe references and media fallback                                                                 |
| `/cart` and drawer        | loading, empty, error, success, merge notice, unavailable, requires-review                                                  | drawer has Escape handling but no focus trap/return; body scroll remains active; visual states differ between drawer/page              | modal focus containment/return, state parity, editable blocked lines, successful cross-route checkout link                                     |
| `/sign-in`                | mobile step, OTP step, busy, error, success                                                                                 | no route-level fixture matrix; OTP context and resend/edit hierarchy need visual polish                                                | keyboard-only request/verify, paste/autofill-compatible field, invalid/rate-limited/success evidence                                           |
| `/account`                | loading, unauthenticated, profile, address empty/create/edit/delete, error, success                                         | numbered sections create a dashboard-like rhythm; destructive confirmation is native browser UI                                        | editorial account hierarchy, owned-data states, labeled forms, mixed-direction mobile/postal data                                              |
| `/checkout`               | loading, unauthenticated, empty cart, blocked cart, no address, quote loading/error, eligible/ineligible shipping, redirect | numbered fieldsets and summary density diverge from storefront; selected method and unavailable method need clearer non-color state    | complete Product/Outfit quote journey, server-owned values, keyboard radio flow, disabled/error/success evidence                               |
| `/payment/fake`           | loading, unauthorized, missing attempt, success/pending/failed/cancelled/tampered callbacks                                 | deliberately technical surface but not visually related to KELE; no Site shell                                                         | clearly marked non-production gateway, deterministic outcomes and accessible busy/disabled states                                              |
| `/payment/result`         | loading, unauthorized, verified, pending, failed, cancelled, expired, reconciliation, error                                 | text symbols and polling state need consistent accessible status presentation                                                          | all outcomes, no false Order success, no duplicate action, mixed-direction identifiers                                                         |
| `/orders`                 | loading, unauthenticated, empty, error, success                                                                             | empty-state link incorrectly targets non-existent `/products`; list lacks compact mobile grouping                                      | fixed cross-route navigation, owned list, all state fixtures at required viewports                                                             |
| `/orders/[orderNumber]`   | loading, error, success, tracking, return eligible/unavailable, submission success, return history                          | long facts/timeline/return flow needs stronger hierarchy and mixed-direction isolation                                                 | immutable snapshots, keyboard return form, 24-hour eligibility wording, submitted/approved/completed evidence                                  |
| framework error/not found | dependency error, unknown/archived route                                                                                    | no shared header/footer and minimal recovery context                                                                                   | useful recovery action, focus target and coherent brand presentation                                                                           |

## Cross-route navigation audit

The primary customer graph is required to remain connected:

1. Homepage -> Occasion, Journal, Product, Outfit and Catalog.
2. Catalog/Search/Category/Occasion -> PDP.
3. Outfit index -> Outfit detail -> independent component PDP.
4. PDP/Outfit detail -> Cart drawer -> Cart -> Checkout.
5. Checkout unauthenticated state -> Sign in -> Account/Cart merge -> Checkout.
6. Checkout -> Fake Payment -> Payment Result -> owned Order detail.
7. Account -> Orders -> Order detail -> Return request.
8. Header/Footer/Mobile menu -> all primary discovery and customer routes.

No rendered internal link may produce a 404. The existing `/orders` empty-state
link to `/products` is a confirmed defect and must become `/catalog`.

## State and failure acceptance

Every applicable data surface must expose and verify these categories without
inventing backend success:

- loading or slow response with layout-shaped skeletons and `aria-busy`;
- empty/no-results with a route-valid recovery action;
- server/dependency failure preserving user input where applicable;
- disabled command controls while a request is pending;
- unavailable Product/Outfit/Shipping/Return state using text plus visual cue;
- Cart `unavailable` and `requires_review` blockers while remove/update remains
  operable;
- authenticated and unauthenticated variants for protected customer routes;
- payment success, pending, failed, cancelled, expired and reconciliation;
- successful profile/address/cart/checkout/payment/return transitions with live
  status feedback;
- missing or failed imagery with reserved geometry and useful alternatives.

Acceptance fixtures select presentation state through token-authenticated E2E
request headers or deterministic network routing. The runner generates a new
private token for every execution; normal and production requests have no
fixture capability. Fixtures must not alter domain or API behavior.

Before M8 evidence setup, the suite reconciles the deterministic seed again
through the pinned package runner and the existing `kele_e2e` reset guard. This
keeps the accepted route baselines independent from earlier suites that publish
new revisions of the shared Outfit fixture; the reset cannot target a normal or
production database.

### Storefront follow-up acceptance — 2026-09-05

- Every file-backed Storefront page resolves to a segment loading boundary.
  Route-specific loaders may mirror their destination more closely; the root
  boundary covers pages without a closer file, including Homepage and the
  remaining Occasion routes. All variants use layout-shaped skeletons, one
  named busy status region and the existing reduced-motion behavior.
- Outfit detail renders each component Product image and exact Product/color
  link inside the purchase component-option row. The adjacent inclusion control
  remains a separate keyboard target. The former lower composition box is
  absent, and the lower area uses the same related-product component and empty
  state as Product detail while excluding constituent Products.
- Display roles use the shared fluid type scale: Display XL for Homepage and
  Outfit mastheads, Display L for page and Product titles, and Heading M for
  sections. Browser evidence checks the documented mobile and desktop endpoints
  at 390, 768, 1280 and 1440 pixels after Estedad and Vazirmatn finish loading.

Failure cases are an uncovered route, blank or text-only delayed transition,
skeleton motion under reduced motion, a component image/link detached from its
selection row, an incorrect Product/color destination, repeated lower Outfit
composition, constituent Products in related discovery, a legacy oversized
heading clamp, clipped Persian text, or horizontal overflow. These are
presentation changes only; they do not change Outfit revision, availability,
pricing, Cart identity, API or persistence behavior.

### Product-discovery follow-up acceptance — 2026-09-06

- The desktop Products trigger opens one image-led panel with the supplied
  editorial image at the physical left and all eight groups in a four-by-two
  RTL grid. The mobile disclosure presents the same groups in a two-column
  grid. Both surfaces use the supplied line illustrations and contain no
  decorative numbers.
- Catalog group discovery uses the supplied 3:1 photographic backgrounds. It
  remains one column below 640 px and two columns from 640 px upward, preserves
  every image's focal garment, has no horizontal overflow and keeps all links
  usable at 390, 768, 1280 and 1440 px.
- Runtime category illustrations, category backgrounds and the desktop
  editorial image are stored as WebP. The two supplied interface compositions
  are visual references only and are not shipped as Storefront assets.
- The Catalog page aggregates the published Product and Outfit read projections
  into one result grid while preserving their independent cards, prices,
  availability and detail routes under CAT-001. A query filters Outfit cards by
  Outfit name; price sorting compares Product prices with Outfit minimum prices.
  If one projection is temporarily unavailable, the page identifies the partial
  result instead of presenting it as complete.

Failure cases are a numbered group, missing or undecoded artwork, a desktop
editorial image on the physical right, a clipped mobile grid, background text
covering the focal garment, Outfit cards absent from the unfiltered Catalog,
mixed Product/Outfit identity, or horizontal overflow at an acceptance width.

## Viewport and measurable visual acceptance plan

Every critical route is captured from a production build with fixed seed data,
light color scheme, `fa-IR`, `Asia/Tehran`, reduced motion and animations
disabled at screenshot time.

| Name    |   Viewport | Required coverage                                                             |
| ------- | ---------: | ----------------------------------------------------------------------------- |
| mobile  |  390 x 844 | every critical route and all narrow-layout state families                     |
| tablet  | 768 x 1024 | every discovery/commerce layout family and navigation transition              |
| laptop  | 1280 x 800 | full conversion journey, keyboard focus and initial-viewport hierarchy        |
| desktop | 1440 x 900 | every reference-critical Homepage/PDP route and representative extrapolations |

Objective assertions:

- root has `lang="fa-IR"` and `dir="rtl"` on every route;
- document `scrollWidth <= innerWidth` at every acceptance viewport;
- no visible text clipping, control overlap or unintended two-line desktop CTA;
- major shell/hero alignment differs by no more than 8 px within a baseline;
- repeated grid alignment differs by no more than 4 px;
- all meaningful images decode with positive natural dimensions and preserve
  their specified aspect ratio/focal point;
- no page-load CLS above 0.1 in the deterministic journey observation;
- all required interactive targets measure at least 44 x 44 CSS px, except
  inline text links where the surrounding line box and spacing remain usable;
- keyboard focus is always visible at at least 3:1 component contrast;
- normal text reaches WCAG 2.2 AA 4.5:1, large text and component boundaries
  reach 3:1;
- Tab/Shift+Tab reaches controls in visual order, Enter/Space activates them,
  Escape closes modal surfaces and focus returns to the opener;
- reduced motion removes automatic/persistent animation and preserves content;
- representative Persian text plus Latin SKU, mobile, postal, tracking, payment
  and Order identifiers stays isolated and readable;
- browser console has no uncaught error, hydration warning, failed customer
  resource or Next image warning in accepted journeys;
- public pages have useful server HTML, canonical metadata and required
  structured data without duplicates.

Visual comparison policy:

- accepted baselines live below `e2e/milestone-8.spec.ts-snapshots/`;
- human-readable full-page evidence lives below `output/playwright/milestone-8/`;
- gate-time captures use ignored `output/playwright/.e2e-run/milestone-8/` paths;
- comparison uses `animations: disabled`, hidden caret, ready fonts and decoded
  images;
- exact snapshot comparisons use `maxDiffPixelRatio <= 0.01`; any approved
  cross-platform font-rendering delta must still pass hierarchy, geometry and
  overflow assertions and be recorded in this contract;
- baseline updates require an intentional M8 review, never a blind update flag.

## Accessibility plan

- one `main` landmark and one visible `h1` per route;
- skip link on all Site-shell pages;
- accessible names for icon-only and image-selection controls;
- modal Cart and mobile navigation contain focus, support Escape and return
  focus to the invoking control;
- form labels remain visible, errors are associated or announced, field input
  survives recoverable failure and busy controls are disabled;
- selected, unavailable and error meaning never depends on color alone;
- Product/Outfit image alternatives describe the visible garment or scene;
- automated accessibility scan reports no critical/serious WCAG 2.2 AA issue,
  followed by keyboard-only journey evidence.

## Performance observations and budget

Milestone 8 records, rather than invents, performance claims. The acceptance
journey records navigation timing, image count/bytes where available, CLS and
long tasks for representative Homepage, Catalog, PDP, Cart and Checkout pages.

Targets remain LCP < 2.5 s, INP < 200 ms and CLS < 0.1 in a local production
build as directional evidence. Final network performance certification remains
Milestone 9 because production CDN, final Media and monitoring are unresolved.
No new animation or UI dependency is justified for Milestone 8.

## DES-001 through DES-005 disposition

The explicit user instruction in the M8 gate-remediation task, dated 2026-08-06
(`Asia/Tehran`), grants the following waivers for Milestone 8 engineering exit
only. The waivers are not final product/design approval and do not approve any
asset, font licence, usage right or breakpoint for production. Each waiver
expires at its stated release gate; an unresolved item then keeps production
launch at `NO-GO`.

| ID      | Temporary M8 waiver                                                                                                                                                                                         | Resolution owner                                                            | Resolution due                                                           | Launch effect                                                                                                                           |
| ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- | ------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------- |
| DES-001 | The customer-supplied signature PNG temporarily replaces the typed wordmark in Storefront and Administration for local review only. It is explicitly not the final logo.                                    | Product Owner (accountable); Brand/Design owner (delivery)                  | Before production release-candidate visual sign-off                      | This question remains open and launch remains `NO-GO` until the final primary, monochrome and favicon assets are supplied and approved. |
| DES-002 | The Estedad/Vazirmatn default and Elize/Peyda or Markazi legacy review choices remain provisional brand pairings. Bundled OFL evidence covers the new open-source files but grants no final brand approval. | Product Owner (accountable); Legal/Procurement and Design owners (delivery) | Before any production release candidate embeds or serves the final fonts | M8 may close; launch remains `NO-GO` until the final pairing and any required legacy licences are approved or replaced.                 |
| DES-003 | Repository prototype imagery and the reserved missing-media treatment may be used only for M8 evidence. No usage right or production approval is implied.                                                   | Product Owner (accountable); Creative/Content owner (delivery)              | Before production content freeze and customer-facing UAT                 | M8 may close; launch remains `NO-GO` until final photography, rights, focal points and crops are approved.                              |
| DES-004 | The 76 route baselines are engineering extrapolation candidates only; they are not final product/design approval.                                                                                           | Product Owner and Design owner (jointly accountable)                        | Before production UAT and final design sign-off                          | M8 may close; launch remains `NO-GO` until the extrapolated route families receive product/design approval.                             |
| DES-005 | The content-driven 640/1024 boundaries and 390/768/1280/1440 evidence widths are provisional M8 acceptance values only.                                                                                     | Product Owner and Design owner (accountable); Frontend lead (validation)    | Before production responsive UAT and breakpoint sign-off                 | M8 may close; launch remains `NO-GO` until responsive behavior and breakpoint boundaries are approved.                                  |

`docs/open-questions.md` is the operational register for these five launch
blockers and carries the same scope, owners, due gates and launch effects.

## Verification outputs

The final milestone report must include:

- branch and coherent commit hashes;
- route/state/viewport matrix with pass/fail counts;
- baseline, full-page evidence, CLI snapshot and trace paths;
- keyboard, focus, contrast, accessible-name and automated scan results;
- visual deltas from the three supplied references and reasons;
- performance observations with environment limitations;
- exact unresolved DES inputs and provisional fallbacks;
- format, lint, type-check, unit, integration, architecture, OpenAPI, contract,
  build, E2E, dependency and secret-scan gate results;
- schema/API/migration/security/rollback statement.
