# ADR-0002: Canonical Product, ColorVariant, and SKU model

Status: Accepted  
Date: 2026-07-24  
Amends: `02-domain-model.md`  
Supersedes conflicting sections of: `06-persistence-model.md`

## Context

The Domain Model defines `Product -> ColorVariant -> SKU` and assigns
color-specific images to ColorVariant. The Persistence Model flattens color
onto Product SKU and attaches images directly to Product. Both cannot be
authoritative.

The design references show a color selector that changes the product imagery,
while size selects a purchasable variation. This supports an explicit color
variant.

## Decision

Use the following canonical hierarchy:

```text
Product
  └── ColorVariant
        ├── Media assignments
        └── SKU (one per supported size)
              ├── Current price
              └── Inventory
```

### Ownership

- Product owns commercial identity, copy, categories, SEO, and lifecycle.
- ColorVariant owns color identity, swatch metadata, display order, featured
  media, gallery ordering, and lifecycle.
- SKU owns globally unique SKU code, normalized size, lifecycle, and
  purchasability.
- Pricing owns current and historical SKU price.
- Inventory owns physical and reserved quantities plus immutable movements.
- Media assets are reusable library objects; ordered media assignments belong
  to ColorVariant.

### Identity and constraints

- `(product_id, normalized_color_code)` is unique among active variants.
- `(color_variant_id, normalized_size)` is unique among active SKUs.
- SKU code is globally unique and never reused.
- A Product may be Draft while incomplete.
- Publication validation follows PUB-006 through PUB-008.
- Archive rather than physically delete objects referenced by history.

## Consequences

- Product cards may present color variants independently without duplicating
  products.
- Image changes remain aligned with color selection.
- Persistence mappings are slightly more explicit than a flattened SKU model.
- Search documents may denormalize names/colors for querying, but the source of
  truth remains the aggregate.

## Migration note

No production schema exists. The first Prisma schema must implement this ADR,
not the flattened imported persistence proposal.

