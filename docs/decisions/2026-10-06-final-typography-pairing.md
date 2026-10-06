# Final typography pairing

Status: Approved and incorporated
Date: 2026-10-06
Source: Product Owner instruction

## Decision

- **Parastoo Variable** is the final display and heading face for Storefront and
  Administration.
- **Vazirmatn Variable** is the final body, control, label and price face.
- `KELE_TYPOGRAPHY=parastoo-vazirmatn` is the default environment setting for
  both applications.
- `estedad-vazirmatn`, `elize` and `markazi` remain explicit legacy rollback
  settings for engineering comparison only. They are not approved final brand
  pairings.

## Provenance and licensing

Both faces are self-hosted from
`packages/design-system/assets/fonts/open-source/` with recorded upstream
sources, file checksums and bundled SIL Open Font License 1.1 notices:

- Parastoo: Google Fonts rebuild at
  https://github.com/googlefonts/parastoo-font; bundled variable TTF from
  `google/fonts` (`LICENSE-Parastoo.txt`).
- Vazirmatn: official upstream at https://github.com/rastikerdar/vazirmatn;
  bundled variable WOFF2 (`LICENSE-Vazirmatn.txt`).

No external font CDN is used at runtime.

## Rationale and impact

The approved pairing matches the editorial, heritage-informed direction for KELE
headings while keeping body text, prices and controls in a quiet sans-serif role.
This resolves **DES-002** and clears the typography launch blocker recorded in
`docs/open-questions.md`.

This decision does not resolve DES-001 logo assets, DES-003 photography,
DES-004 route extrapolation, DES-005 breakpoints or DES-006–DES-007 content
claims. It approves no customer-facing business claim beyond typography choice.
No business rule, API contract or schema change is required.
