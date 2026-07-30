# ADR-0003: Versioned Outfit composition and derived availability

Status: Accepted
Date: 2026-07-24
Employer confirmation: Open Questions Resolution v1

## Context

An Outfit is an independently marketed and priced curated look. Imported
documents disagree on whether it references Products or Product SKUs. A
customer buys an Outfit at a selected size, but inventory exists only on
component SKUs.

The system must reproduce what was sold, avoid storing fake Outfit inventory,
and reserve the exact physical items.

## Decision

An Outfit owns commercial identity and a sequence of immutable composition
revisions.

```text
Outfit
  └── OutfitRevision
        ├── OutfitItem -> Product + default ColorVariant + quantity
        └── OutfitSize
              ├── price
              └── OutfitSizeComponent -> exact SKU + quantity
```

- Draft edits may update a draft revision.
- Publishing freezes the revision.
- Changing composition, default colors, or component mapping of a published
  Outfit creates a new revision.
- Each sellable Outfit size has its own price.
- Each Outfit size resolves to exact component SKUs before publication.
- Outfit available quantity is the minimum of
  `floor(component available quantity / required quantity)` across components.
- Outfit inventory is never stored.
- Reserving an Outfit creates reservations for all component SKUs in one
  transaction.
- Order items store an Outfit snapshot plus component SKU snapshots.
- Individual component products remain independently purchasable.

## Confirmed size mapping

The employer approved an explicit mapping for every Outfit Revision. The
implementation stores each customer-facing Outfit size and the exact component
SKUs and quantities required for that size. It SHALL NOT rely on string
equality between Outfit and garment sizes.

## Consequences

- Historical outfits remain reproducible.
- Availability and checkout are deterministic.
- Publishing requires more administrative configuration.
- A component price change does not change Outfit price.
- A component archive prevents new publication/reservation but does not damage
  historical orders.
