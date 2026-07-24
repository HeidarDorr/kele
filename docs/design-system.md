# KELE storefront design system

Version: 0.1  
Status: Provisional, derived from supplied visual references  
Scope: Storefront. Administration UI uses the same tokens with denser layouts.

This document converts the visual references into implementable constraints.
Exact fonts, logo assets, and final RTL direction remain open questions.

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

- Display: high-contrast editorial serif with licensed web files.
- UI/body: humanist or neo-grotesque sans-serif with clear Persian support if
  RTL is selected.
- Logo is an asset, not typed text.
- Display headings use controlled line lengths and intentional breaks.
- Body copy targets roughly 45–75 characters per line.
- Uppercase and letter-spacing are for short Latin labels only, never Persian.
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

Desktop: announcement bar, balanced navigation, centered or compositionally
anchored logo, search/account/bag actions. Mobile: menu, centered logo, search
and bag; preserve 44 px minimum interactive targets.

### Product card

Image dominates. Show name, formatted price, color availability and optional
wishlist only if OQ-009 is accepted. Avoid card borders and shadows. All card
states must preserve layout.

### Product detail

Desktop uses thumbnail rail + primary gallery + purchase panel. Mobile stacks
gallery and purchase controls with a clearly reachable purchase action. Color
selection updates gallery; size selection updates price/availability. Tabs or
accordions expose description, details, size/fit, and shipping/returns.

### Editorial occasion tile

Photography with controlled dark overlay, serif label and restrained accent
arrow. Never place unreadable text over a busy focal area.

### Footer

Dark espresso inverse surface, restrained newsletter area if approved,
semantic navigation groups, social links and legal links. Mobile groups may
collapse but remain keyboard accessible.

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

