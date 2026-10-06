# KELE storefront design system

Version: 0.1
Status: Provisional, derived from supplied visual references
Scope: Storefront. Administration UI uses the same tokens with denser layouts.

This document converts the visual references into implementable constraints.
Version 1 is Persian (`fa-IR`) and Right-to-Left. Final typography is approved
in `decisions/2026-10-06-final-typography-pairing.md`. Production-ready vector
and favicon logo variants remain open under DES-001. The customer-supplied
signature raster is only the implemented review placeholder; it is not the
final or production-approved logo.

## Creative direction

KELE is an editorial luxury boutique, not a marketplace. The interface should
feel warm, composed, tactile, and confident.

Use:

- generous negative space;
- warm ivory surfaces;
- dark espresso typography and actions;
- restrained burnt-orange accents;
- high-quality product and editorial photography;
- restrained Persian display typography paired with quiet sans-serif utility text;
- thin dividers and near-flat surfaces.

Avoid:

- generic SaaS cards;
- excessive pills, gradients or heavy shadows;
- crowded grids and promotion stacks;
- bright ecommerce red;
- uncontrolled animation;
- default shadcn/ui styling.

## Provisional tokens

Final values must be sampled/approved with source design files.

## Approved typography

The final pairing approved on 2026-10-06 is the default for both Storefront and
Administration:

- `KELE_TYPOGRAPHY=parastoo-vazirmatn` uses **Parastoo** for display-heading
  roles while preserving each component's existing hierarchy (mostly weight 400,
  with selected headings at 500). **Vazirmatn** covers body text at weight 400
  and uses weights 500–600 where navigation, controls, labels or prices need
  emphasis.
- `KELE_TYPOGRAPHY=estedad-vazirmatn` retains the earlier Estedad/Vazirmatn
  review pairing as an explicit legacy rollback choice.
- `KELE_TYPOGRAPHY=elize` retains Elize headings with Peyda body/control text as
  another explicit legacy rollback choice.
- `KELE_TYPOGRAPHY=markazi` retains the Markazi Text storefront display variant
  with Peyda body/control text as another explicit legacy rollback choice.

Both approved faces are self-hosted from
`packages/design-system/assets/fonts/open-source/` with recorded upstream
provenance, the font manifest and bundled SIL Open Font License 1.1 notices.
Legacy rollback fonts retain their bundled licences under `open-source/` and
`provisional/`. Typography selection preserves the existing signature-image
wordmark and other artwork. It does not approve the final logo or any
customer-facing business claim.

Because `next/font` creates build assets, change the setting before building or
running development and restart both Next applications after changing it.
Rollback consists of selecting an explicit legacy value and rebuilding or
restarting the applications; no data migration is required.

Acceptance requires loaded Parastoo heading faces and loaded Vazirmatn body,
control, label and price faces, verified in the browser rather than inferred
from CSS declarations. At widths 390, 768, 1280 and 1440 pixels, Persian titles
and mixed-direction identifiers must remain readable without clipping or
horizontal overflow. Missing font files, silent fallback rendering, the display
face leaking into prices or controls, clipped lines, and changed artwork are
failure cases. Adjust heading weight and line height for the approved family
while preserving the page hierarchy, RTL behavior and existing business states.

```css
:root {
  --kele-canvas: #f5efe7;
  --kele-surface: #fbf7f1;
  --kele-surface-muted: #eee5d9;
  --kele-ink: #30251e;
  --kele-ink-muted: #776b61;
  --kele-line: #ded3c7;
  --kele-accent: #c86f2c;
  --kele-accent-strong: #b04600;
  --kele-accent-soft: #f2ddc9;
  --kele-inverse: #2b1f18;
  --kele-inverse-text: #f8f1e9;
  --kele-inverse-text-muted: #d3c4b4;
  --kele-danger: #9d302b;
  --kele-success: #426348;
}
```

`--kele-accent-soft` is a tinted ground for selected and highlighted surfaces
and for short labels on the inverse surface. `--kele-inverse-text-muted` is
secondary copy on the inverse surface. Neither is a body-text color on the warm
canvas.

Motion is tokenised so timing stays consistent across surfaces:

```css
:root {
  --kele-ease: cubic-bezier(0.22, 0.7, 0.24, 1);
  --kele-duration-micro: 160ms;
  --kele-duration-panel: 280ms;
  --kele-duration-reveal: 640ms;
}
```

No color token is accepted for text until contrast is verified against its
intended background.

## Typography

- Display: an approved Persian-capable editorial display face with licensed web
  files; Latin display text may use a paired high-contrast serif.
- UI/body: a legible Persian sans-serif with correct shaping and numerals.
- The current logo placeholder is the supplied signature asset, not typed text.
  Its visible crop and stroke geometry must remain unchanged; presentation may
  invert it for dark surfaces. This placeholder grants no approval of the final
  logo system.
- Display headings use controlled line lengths and intentional breaks.
- Body copy targets roughly 45–75 characters per line.
- Uppercase and letter-spacing are for short Latin labels only, never Persian.
- Components use logical CSS properties (`margin-inline`, `inset-inline`,
  `text-align: start`) and are tested under `dir="rtl"`.
- Directional icons and navigation motion mirror where meaning requires it;
  universal icons such as search and account do not.
- Price numerals must align and remain readable at mobile sizes.

Provisional scale:

| Token | Desktop | Mobile | Use |
|---|---:|---:|---|
| Display XL | 64/68 | 40/44 | Homepage hero |
| Display L | 44/50 | 32/38 | Product/page title |
| Heading M | 28/34 | 24/30 | Section title |
| Body | 16/26 | 16/25 | Descriptive copy |
| UI | 14/20 | 14/20 | Controls |
| Caption | 12/18 | 12/18 | Metadata |

The shared heading-size variables implement the three display roles and keep
the endpoints reviewable across both applications:

```css
:root {
  --kele-type-display-xl: clamp(2.5rem, calc(1.75rem + 2.5vw), 4rem);
  --kele-type-display-l: clamp(2rem, calc(1.6rem + 1.6vw), 2.75rem);
  --kele-type-heading-m: clamp(1.5rem, calc(1.35rem + 0.55vw), 1.75rem);
}
```

Use these roles instead of page-specific oversized heading clamps. Body,
control and metadata text retain the table values so reducing display sizes
does not make purchasing or account content harder to read. Browser review at
390, 768, 1280 and 1440 pixels must confirm the computed role, wrapping and
line height rather than checking only the declared CSS.

## Spacing and layout

Base spacing unit is 4 px. Preferred sequence:
`4, 8, 12, 16, 24, 32, 48, 64, 96, 128`.

- Desktop content max width: 1440 px with 48–72 px gutters.
- Small laptop gutters: 32–48 px.
- Tablet gutters: 24–32 px.
- Mobile gutters: 16–20 px.
- Major editorial sections use 80–128 px vertical separation on desktop and
  56–80 px on mobile.
- Dense commerce controls may use smaller internal spacing without compressing
  the overall page rhythm.

Provisional breakpoints:

```text
mobile: 0–639
tablet: 640–1023
desktop: 1024–1439
wide: 1440+
```

Breakpoints are chosen by content failure, not device names.

## Shape, borders, and elevation

- Corners are square or subtly rounded, generally 0–4 px.
- Dividers are 1 px warm neutral.
- Primary buttons are solid espresso with high-contrast text.
- Shadows are rare and shallow; use them only for overlays or focus hierarchy.
- Selected size uses strong fill/contrast, not color alone.
- Swatches include visible selected, unavailable, hover and focus states.

## Photography

- Editorial hero imagery is architectural and directional, with planned copy
  negative space.
- Product imagery is consistent in lighting, scale and background.
- Store focal point metadata for responsive crops.
- Do not stretch or crop faces/garments unintentionally.
- Use responsive `sizes`, modern formats, reserved aspect ratio and meaningful
  alt text.
- Generated imagery may be used for internal prototypes only unless commercial
  rights and brand approval are recorded.

## Motion

Motion is restrained and functional:

- 120–180 ms for micro-feedback;
- 200–320 ms for drawers/menus;
- ease curves without bounce for premium calm;
- image crossfade/slide only when selection changes; mobile uses mirrored entry
  motion for previous and next navigation, while tablet and desktop use a short
  opacity-only fade;
- no scroll hijacking;
- honor `prefers-reduced-motion`.

Route transitions use layout-shaped skeletons built from the same canvas,
surface, line and spacing tokens as the destination page. Every file-backed
Storefront page resolves to either its nearest segment `loading.tsx` or the root
fallback, including Homepage and Occasion routes. A loading surface exposes one
named `role="status"` region with `aria-busy="true"`; its visual blocks are
decorative. Text-only loaders and unrelated spinner treatments are not part of
the storefront language. Reduced-motion mode removes the skeleton sweep while
leaving its reserved geometry visible.

Textual actions keep their resting foreground, border and fill colors on hover.
Their micro-feedback is a one-pixel `currentColor` rule that reveals from right
to left, extends slightly beyond the text and retracts through the same short
motion. The absolutely positioned rule remains centered and never changes the
button's content padding or label alignment. Icon-only header actions use only a
compact softly scaling circular ground inside the unchanged 44 px target, use
120 ms micro-feedback and never recolor the icon.

## Core components

### Header

The storefront header is fixed at every viewport. It uses a warm translucent
canvas, restrained backdrop blur and an equal-height layout spacer so page
content and fragment targets are never obscured. Desktop keeps the balanced RTL
navigation and centered wordmark; search, account and bag actions are compact,
icon-only controls with accessible names. Mobile keeps the menu and bag, uses a
92 px wordmark, and preserves 44 px minimum interactive targets. Text links do
not translate on interaction: links without a resting underline reveal a
`currentColor` line from right to left and retract with the reverse motion. The
line uses one optical gap within each chrome context and extends slightly beyond
the word on its physical left. Links with a resting line match the word width at
rest, then expose the same short left overhang on hover. Route-active header
items keep their text color and show the completed word-width line. The Products
line remains visible and expands while its disclosure is open. The desktop Products disclosure
uses the same numbered, thin-divider language as the Catalog index in a four by
two grid. The header search action deep-links to the Catalog tools, scrolls them
to a lower reading position in the upper two-thirds of the viewport and focuses
the labelled search field. The same focus behavior is available from the mobile
menu. Below the 1024 px desktop boundary, Mobile navigation and Cart remain
mounted through their short opaque fade-out so closing is as deliberate as
opening; directional Cart motion is reserved for desktop. Mobile drawer links
do not use decorative underlines, including for their route-active state.

### Product card

Image dominates. Show name, formatted toman presentation, and color
availability. Wishlist is intentionally absent in version 1. Avoid card borders
and shadows. All card states must preserve layout.

### Product detail

Desktop places the restrained thumbnail rail and primary gallery on the left and
the RTL purchase panel on the right; the full grid is capped so Product imagery
does not dominate a laptop viewport. Mobile stacks gallery and purchase controls
with a clearly reachable purchase action. Outfit detail uses the same capped
desktop grid, physical left thumbnail rail and RTL purchase composition. Its
component-option group pairs each inclusion control with the component image,
Product name, selected-color facts and an independently focusable link to that
exact Product/ColorVariant. The control and Product link remain separate targets
so following a Product never changes the pending Outfit selection. The page
does not repeat the same composition in a lower grid; its lower discovery band
uses the Product-detail related-products structure and excludes the Outfit's
constituent Products.

Color selection on a Product moves the gallery to that color's featured image
but does not filter out imagery assigned to the Product's other published
colors; size selection updates price/availability. Mobile supports horizontal
RTL-aware touch swipes between the previous and next image while retaining the
reachable thumbnail rail and vertical page scrolling. Tabs or accordions expose
description, details, size/fit, and shipping/returns. The lower Product
information band is an editorial atelier note rather than a card: numbered
section headings, one short accent rule and divided detail rows create hierarchy
without adding new product claims. On mobile the description and detail list
use a deliberate offset, while an absent detail list collapses without
reserving an empty panel.

### Editorial occasion tile

Photography with controlled dark overlay, display label and restrained accent
arrow. Never place unreadable text over a busy focal area.

### Art-direction slot

Missing editorial artwork is not a blank box. Each image the storefront expects
is registered in `apps/storefront/lib/art-direction.ts` with its destination
path, aspect ratio, pixel dimensions, composition constraint and generation
prompt. `EditorialMedia` renders the real file when it exists on disk and the
brief when it does not, at exactly the geometry the photograph will occupy, so
delivering the file cannot move the layout.

Two slot variants exist because the failure modes differ:

- `panel` owns its frame and shows the whole brief with the prompt expanded.
- `backdrop` sits behind headline copy. It drops the striped ground, folds the
  prompt into a `details` element and moves the card to a corner. Section
  scrims stand down while a backdrop slot is present, because a scrim only
  exists to protect copy over a photograph.

Briefs are a design and review affordance. They render outside production, or
wherever `KELE_ART_DIRECTION_BRIEFS=on` is set. In production the same missing
image degrades to the reserved unavailable state. Delivering artwork is content
work, not a code change: drop the file at the recorded path and the brief
retires itself.

### Footer

Dark espresso inverse surface with semantic navigation groups, social links
and legal links. Newsletter collection is absent in version 1. Mobile groups
may collapse but remain keyboard accessible. A labelled 44 px circular control
at the footer tail returns the page to the top and honors reduced motion.

### Forms

Labels remain visible. Placeholder is not a label. Errors are specific and
preserve user input. OTP fields support paste, autofill and non-fragmented
screen-reader interaction.

## Administration UI

Use the same colors and typography sparingly, but prioritize clarity:

- data tables and forms over decorative cards;
- explicit status and destructive-action confirmation;
- filters that retain URL state;
- audit context visible near risky actions;
- no attempt to make operational screens resemble the editorial storefront.

## Milestone 8 storefront convergence

Milestone 8 makes the previously incremental customer surfaces one coherent
system without changing commerce behavior or server contracts.

- Design dials are fixed at variance 6, motion 3 and density 3: discovery pages
  may use controlled editorial asymmetry; commerce pages remain predictable;
  motion is limited to functional menu, drawer and selection feedback.
- `--kele-canvas`, `--kele-surface`, `--kele-surface-muted`, `--kele-ink`,
  `--kele-ink-muted`, `--kele-line`, `--kele-accent-strong` and the inverse
  footer palette are the only storefront foundation colors. The strong accent
  uses a vivid approved orange while retaining a 4.52:1 contrast ratio on
  the warm muted surface; muted ink also remains WCAG AA compliant.
- Display headings use the provisional local display family and body, labels
  and controls use the provisional local text family. Long desktop headings
  are constrained by readable measures rather than arbitrary narrow columns.
- Spacing follows an 8 px rhythm with large discovery-section intervals and a
  44 px minimum control size. Commerce groups use dividers and whitespace, not
  nested cards or default component-library chrome.
- Phosphor supplies the consistent menu, bag, customer, close and payment-state
  icons. Icons never carry status or an accessible name without adjacent text
  or an explicit control label.
- The header, mobile navigation, cart drawer and footer are shared across the
  complete version-1 graph. Both modal surfaces trap focus, close with Escape,
  prevent background scroll and return focus to their opener. Narrow navigation
  and cart panels use the same opaque canvas and simple fade; the desktop cart
  enters from the physical left edge toward the right.
- The provisional responsive boundaries are below 768 px for the narrow
  single-column composition, 768–1023 px for tablet composition and 1024 px or
  wider for the desktop/laptop composition. Acceptance viewports are 390×844,
  768×1024, 1280×800 and 1440×900. DES-005 remains open until sign-off.
- Product and editorial media preserve aspect ratio and focal-point metadata.
  Missing media reserve geometry and state that the image is unavailable; M8
  does not generate replacement Product photography.
- Reduced-motion mode removes smooth scrolling and all non-essential animation
  while preserving state and content. Screenshot fixtures additionally disable
  animations and caret rendering after fonts and images settle.

The stable visual contract is
`docs/milestone-8-storefront-acceptance.md`; accepted comparison images live in
`e2e/milestone-8.spec.ts-snapshots/` and review captures live in
`output/playwright/milestone-8/`. DES-001 through DES-005 remain explicit launch
inputs in `docs/open-questions.md`.

## Homepage composition

The Homepage is the one page that has to argue for the brand before it sells
anything. Version 1 leads with complete sets: a hero, the brand promise, one
editorial spread per featured set, and the closing band.

Published sections render in their CMS order. Brand-owned sections are anchored
to the section they follow:

| Position | Section | Source |
|---|---|---|
| 1 | Full-bleed hero, presenting one Hero Outfit | CMS `hero` |
| 2 | Brand promise, a compact strip of four icon statements divided by hairlines | Brand-owned, follows the hero |
| 3 | Set spreads, one per referenced Outfit | CMS `featured_outfits` |
| — | Occasions, curated products, brand story, Journal | CMS `occasion_grid`, `featured_products`, `brand_story` / `editorial_banner`, `journal_highlights`; rendered only when an editor publishes them |
| last | Closing band | Brand-owned, always last |

The retired category grid, craft triptych and styling intro are preserved on the
`archive/home-full-sections` branch.

Composition rules:

- The hero is edge to edge at every viewport. On desktop a warm scrim is pulled
  from the inline start so Persian copy sits on canvas while the photograph
  keeps the full width. Below 768 px the hero stacks: photograph first at 4:5,
  copy beneath on canvas, no scrim. Hero photography must reserve its inline-end
  third as quiet negative space.
- Curated rows are scrolling rails with a fixed card measure, not grids. A
  curation of one then reads the same as a curation of eight instead of
  stranding a single card in a wide grid. Each rail closes with a card linking
  to the full listing.
- Sections that can receive one item compose for that case explicitly: a lone
  occasion pairs with an editorial aside, and a lone journal article becomes a
  wide two-column card.
- Each featured set is a full spread: its featured image (4:5) on the outer
  edge, its next gallery image (4:5) raised beside it and, when the gallery has
  one, a third scene frame (5:4) stacked under that detail. The copy carries an
  accent piece-count label above the name, the description, starting price,
  availability and a "مشاهده ست" action; the individual pieces are listed on
  the set page, not in the spread. Spreads carry no ordinal numbering. Spreads
  alternate sides and surfaces in the order the editor chose, and the images
  keep the wider column on either side. Below 1024 px the copy stacks under the
  images; below 768 px only the featured image remains. A set whose detail
  cannot be read is left out, and a section with no readable set states that
  nothing is published.
- The closing band is the only inverse surface in the page body. The solid
  button inverts there so it stays visible.
- When the published Homepage cannot be read, the brand-owned sections still
  render. The page states plainly that the published narrative is unavailable
  and keeps the catalogue reachable, rather than collapsing to a bare notice.

### Replacing the demo sets

Outside E2E, the development seed publishes four demo Outfits. Three
(`evening-velvet-set`, `camel-vest-set`, `olive-summer-set`) are featured as set
spreads; `beige-linen-set` is the Hero Outfit, the set the hero photograph
shows. Replacing them with real sets needs no code change:

1. In the administration app, create each real Outfit under ست تازه (`/outfits/new`),
   with its category, items, sizes resolved to exact SKUs, prices and editorial
   media. The featured image is the spread's lead frame; the next gallery image
   is its detail frame, and an optional third gallery image (landscape 5:4)
   becomes its scene frame. Publish it.
2. Under صفحهٔ اصلی (`/editorial/homepage`), in the hero section choose the lead
   set under ست هیرو and its wide hero frame (3200 × 1400) under تصویر هیرو. The
   hero action then opens that set and the internal path is ignored.
3. In the ست‌های منتخب section, remove the demo sets, add the real ones and
   order them. Save the draft, then validate and publish.
4. Archive the four demo Outfits from their edit page under ست‌ها so they
   leave the Outfit listing.

The seed re-applies its composition only to Homepage revisions it still owns
(`actorId = 'seed'`) and never un-archives an Outfit, so an editor's published
Homepage survives re-seeding and the UAT start-up reconciliation.
