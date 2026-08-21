# KELE storefront design system

Version: 0.1
Status: Provisional, derived from supplied visual references
Scope: Storefront. Administration UI uses the same tokens with denser layouts.

This document converts the visual references into implementable constraints.
Version 1 is Persian (`fa-IR`) and Right-to-Left. Exact fonts and
production-ready vector/favicon logo variants remain open design inputs. The
customer-supplied signature raster is only the implemented review placeholder;
it is not the final or production-approved logo.

## Creative direction

KELE is an editorial luxury boutique, not a marketplace. The interface should
feel warm, composed, tactile, and confident.

Use:

- generous negative space;
- warm ivory surfaces;
- dark espresso typography and actions;
- restrained burnt-orange accents;
- high-quality product and editorial photography;
- serif display typography paired with quiet sans-serif utility text;
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

## Provisional typography review variants

Typography remains an open design input. Two reviewable storefront display
variants are available without changing layout, spacing, body type or business
behavior:

- `KELE_TYPOGRAPHY=elize` is the default. Elize renders display headings.
- `KELE_TYPOGRAPHY=markazi` uses Markazi Text for Persian display headings.
  Peyda remains the body/control face. Typography selection does not alter the
  image-based wordmark.

Only the Arabic variable WOFF2 subset of Markazi Text is bundled, together with
its SIL Open Font License. Because `next/font` creates build assets, change the
setting before building or running development and restart both Next
applications after changing it. Neither variant, spelling treatment nor font
pairing is a frozen brand decision.

```css
:root {
  --kele-canvas: #f5efe7;
  --kele-surface: #fbf7f1;
  --kele-surface-muted: #eee5d9;
  --kele-ink: #30251e;
  --kele-ink-muted: #776b61;
  --kele-line: #ded3c7;
  --kele-accent: #c86f2c;
  --kele-accent-strong: #a8541d;
  --kele-inverse: #2b1f18;
  --kele-inverse-text: #f8f1e9;
  --kele-danger: #9d302b;
  --kele-success: #426348;
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

Use fluid `clamp()` between approved endpoints where it improves wrapping.

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
- image crossfade/slide only when selection changes;
- no scroll hijacking;
- honor `prefers-reduced-motion`.

## Core components

### Header

Desktop: announcement bar, balanced RTL navigation, centered or
compositionally anchored logo, search/account/bag actions. Mobile: menu,
centered logo, search and bag; preserve 44 px minimum interactive targets.

### Product card

Image dominates. Show name, formatted toman presentation, and color
availability. Wishlist is intentionally absent in version 1. Avoid card borders
and shadows. All card states must preserve layout.

### Product detail

Desktop uses thumbnail rail + primary gallery + purchase panel. Mobile stacks
gallery and purchase controls with a clearly reachable purchase action. Color
selection updates gallery; size selection updates price/availability. Tabs or
accordions expose description, details, size/fit, and shipping/returns.

### Editorial occasion tile

Photography with controlled dark overlay, serif label and restrained accent
arrow. Never place unreadable text over a busy focal area.

### Footer

Dark espresso inverse surface with semantic navigation groups, social links
and legal links. Newsletter collection is absent in version 1. Mobile groups
may collapse but remain keyboard accessible.

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
  footer palette are the only storefront foundation colors. Muted ink and the
  strong accent were darkened to meet WCAG AA on the warm muted surface.
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
  prevent background scroll and return focus to their opener.
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
