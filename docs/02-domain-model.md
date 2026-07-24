# KELE Website Specification

## Document Information

| Field | Value |

|--------|-------|

| Document | 02-domain-model.md |

| Title | Domain Model |

| Version | 1.0 |

| Status | Frozen |

| Depends On | 01-project-overview.md |

| Required By | All Documents |

| Last Updated | 2026-07-13 |

---

> Amendment notice (2026-07-24): ADR-0002 is authoritative for the
> Product → ColorVariant → SKU hierarchy. ADR-0003 is authoritative for
> versioned Outfit composition. ADR-0004 clarifies pre-order checkout/payment
> entities.


# Purpose

This document defines the business domain of the KELE ecommerce
platform.

It establishes the business objects used throughout the specification
and defines ownership, responsibilities and relationships between them.

The Domain Model is implementation-independent.

It describes the business itself rather than any database schema, API
design or frontend implementation.

Every subsequent specification document SHALL comply with the
definitions established in this document.

---

# Domain Design Principles

The KELE domain follows the principles below.

## Single Source of Truth

Each business fact SHALL have exactly one owner.

Business information MUST NOT be duplicated across different business
objects.

Whenever possible, information SHALL be referenced instead of copied.

---

## Separation of Business and Presentation

Business entities SHALL remain independent from frontend representation.

Frontend interfaces MAY display the same business object in different
ways without changing the underlying business model.

---

## Composition Over Duplication

New business objects SHOULD reuse existing business objects whenever
possible.

Relationships are preferred over duplication.

---

## Independent Lifecycle

Each business object SHALL manage its own lifecycle.

Relationships between business objects MUST NOT merge their identities.

For example:

Archiving an Outfit SHALL NOT archive its Products.

Deleting a Category SHALL NOT delete Products.

Publishing a Product SHALL NOT automatically publish an Outfit.

---

# Commercial Objects

KELE defines two independently sellable business objects.

- Product

- Outfit

Both business objects:

- are independently published

- have dedicated URLs

- have dedicated SEO metadata

- appear inside catalog pages

- may be searched

- may be purchased

- may be archived

Although both are sellable, they follow different business rules.

---

# Domain Overview

Version 1 defines the following business objects.

- Category

- Product

- Color Variant

- SKU

- Inventory

- Outfit

- Outfit Item

- Customer

- Order

- Review

- Journal Article

# Category

## Definition

A Category is a navigational and organizational object used to group
Products and Outfits.

Categories improve product discovery and support content organization
throughout the website.

Categories do not own Products or Outfits.

---

## Responsibilities

A Category SHALL define:

- Name

- Slug

- Description (optional)

- Display Order

- Visibility Status

---

## Ownership

A Category owns only its own metadata.

It does not own any Product, Outfit or Journal Article.

Relationships are maintained through references.

---

## Relationships

A Category MAY contain zero or more Products.

A Category MAY contain zero or more Outfits.

A Product MAY belong to multiple Categories.

An Outfit MAY belong to multiple Categories.

Journal Articles MAY reference one or more Categories.

---

## Business Rules

Deleting a Category SHALL NOT delete Products or Outfits.

Unpublishing a Category SHALL NOT affect the publication status of
related Products or Outfits.

Categories MAY be used by CMS components for dynamic content selection.

---

## Lifecycle

Supported lifecycle states:

- Draft

- Published

- Archived

Only Published Categories SHALL appear on the public website.

---

# Product

## Definition

A Product represents a commercial clothing model independent of color,
size and inventory.

Examples include:

- Jacket

- Shirt

- Vest

- Pants

- T-Shirt

- Shorts

- Shoes

A Product defines the commercial identity of a clothing item.

Customers purchase Product SKUs derived from the Product.

---

## Responsibilities

A Product SHALL own:

- Name

- Slug

- Description

- Categories

- SEO Metadata

- Publication Status

A Product SHALL NOT own:

- Images

- Price

- Inventory

- Size

These responsibilities belong to lower-level business objects.

---

## Ownership

A Product owns its commercial identity.

It does not own presentation assets that vary by color, nor commercial
attributes that vary by size.

---

## Relationships

A Product SHALL contain one or more Color Variants.

A Product MAY belong to multiple Categories.

A Product MAY participate in multiple Outfits.

A Product MAY be referenced by Journal Articles.

---

## Business Rules

A Product SHALL contain at least one Color Variant before publication.

A Product SHALL NOT be purchasable until at least one SKU exists.

Archiving a Product SHALL preserve all historical Orders.

Deleting a Product that has historical Orders SHALL NOT be permitted.

---

## Lifecycle

Supported lifecycle states:

- Draft

- Published

- Archived

Only Published Products SHALL appear on the public website.

---

# Color Variant

## Definition

A Color Variant represents one color of a Product.

Each Color Variant defines the visual identity of that color.

Examples:

- White

- Navy

- Cream

---

## Responsibilities

A Color Variant SHALL own:

- Color

- Image Gallery

- Featured Image

- Display Order

An optional Color Code MAY be stored for administrative purposes.

---

## Ownership

A Color Variant owns every visual asset associated with its color.

Images SHALL belong to the Color Variant rather than the Product.

---

## Relationships

Each Color Variant belongs to exactly one Product.

Each Color Variant SHALL contain one or more SKUs.

Outfit Items MAY reference a Color Variant as their Default Color
Variant.

---

## Business Rules

Every published Product SHALL contain at least one published Color
Variant.

Frontend MAY display Color Variants as independent catalog cards.

Backend SHALL continue treating them as part of the same Product.

Changing a Color Variant SHALL NOT affect other Color Variants belonging
to the same Product.

---

## Lifecycle

Supported lifecycle states:

- Draft

- Published

- Archived

Only Published Color Variants SHALL appear on the public website.

---

# SKU

## Definition

A SKU (Stock Keeping Unit) represents one purchasable variation of a
Product.

A SKU is uniquely identified by:

- Product

- Color Variant

- Size

Each SKU represents one physical inventory item.

---

## Responsibilities

A SKU SHALL own:

- SKU Code

- Size

- Selling Price

- Inventory Status

Future versions MAY include:

- Barcode

- Weight

- Dimensions

---

## Ownership

A SKU owns every commercial property that varies by size.

Price belongs exclusively to the SKU.

Inventory belongs exclusively to the SKU through its Inventory record.

---

## Relationships

Each SKU belongs to exactly one Color Variant.

Each SKU has exactly one Inventory record.

Each SKU MAY appear within historical Orders.

---

## Business Rules

Every purchasable Product SHALL be represented by at least one SKU.

SKU Codes SHALL be unique across the entire catalog.

Changing the price of a SKU SHALL NOT modify historical Orders.

Removing a SKU that exists in historical Orders SHALL NOT be permitted.

A SKU with zero inventory SHALL become unavailable for purchase while
remaining visible to customers unless explicitly archived.

---

## Lifecycle

Supported lifecycle states:

- Draft

- Published

- Archived

Only Published SKUs MAY be purchased.

# Inventory

## Definition

Inventory represents the available stock of a SKU.

Inventory is the authoritative source for stock availability.

Inventory SHALL always be managed at SKU level.

Products and Outfits do not own inventory directly.

---

## Responsibilities

An Inventory record SHALL own:

- Available Quantity

- Reserved Quantity (Future)

- Adjustment History

- Last Updated Timestamp

---

## Ownership

Inventory belongs exclusively to one SKU.

Neither Products nor Outfits SHALL maintain independent inventory
values.

---

## Relationships

Each SKU SHALL have exactly one Inventory record.

Orders decrease Inventory.

Inventory adjustments are performed by authorized administrative users.

Future ERP integrations SHALL synchronize with Inventory.

---

## Business Rules

Every inventory adjustment SHALL be logged.

Inventory history SHALL remain permanently queryable.

Inventory quantities SHALL never become negative.

A SKU with zero available quantity SHALL become unavailable for
purchase.

Historical inventory adjustments SHALL remain preserved.

Deleting Inventory records SHALL NOT be permitted.

---

## Lifecycle

Inventory records do not have publication states.

Inventory exists for every SKU regardless of publication status.

---

# Outfit

## Definition

An Outfit represents a complete styling recommendation created by KELE.

Unlike traditional product bundles, an Outfit is an independently
sellable commercial object.

Its purpose is to simplify purchasing decisions while expressing KELE's
styling expertise.

An Outfit consists of one or more Products arranged in a curated
combination.

---

## Responsibilities

An Outfit SHALL own:

- Name

- Slug

- Description

- Selling Price

- Editorial Gallery

- Featured Image

- Categories

- SEO Metadata

- Publication Status

An Outfit SHALL NOT own:

- Product Images

- Product Inventory

- Product Descriptions

These remain owned by their respective business objects.

---

## Ownership

An Outfit owns:

- Editorial presentation

- Commercial identity

- Selling price

An Outfit does not own the Products from which it is composed.

---

## Relationships

An Outfit SHALL contain one or more Outfit Items.

An Outfit MAY belong to multiple Categories.

An Outfit MAY appear on the Homepage.

An Outfit MAY be referenced by Journal Articles.

---

## Business Rules

Every Outfit SHALL reference existing Products.

An Outfit SHALL define its own selling price.

An Outfit selling price SHALL be independent of Product prices.

Products MAY participate in multiple Outfits.

Deleting an Outfit SHALL NOT affect any Product.

Archiving an Outfit SHALL preserve historical Orders.

---

## Availability

An Outfit is considered available only when every required SKU for the
selected size is available.

Inventory availability SHALL always be calculated from the underlying
Product SKUs.

The Outfit itself SHALL NOT maintain inventory quantities.

---

## Lifecycle

Supported lifecycle states:

- Draft

- Published

- Archived

Only Published Outfits SHALL appear on the public website.

---

# Outfit Item

## Definition

An Outfit Item represents one Product inside an Outfit.

It defines how that Product participates in the styling composition.

Outfit Items exist only within their parent Outfit.

They are not independently purchasable.

---

## Responsibilities

Each Outfit Item SHALL define:

- Product

- Default Color Variant

- Display Order

---

## Ownership

Outfit Items own only composition metadata.

They do not own:

- Price

- Inventory

- Images

- Product Information

---

## Relationships

Each Outfit Item belongs to exactly one Outfit.

Each Outfit Item references exactly one Product.

Each Outfit Item MAY specify one Default Color Variant.

A Product MAY participate in multiple Outfit Items across different
Outfits.

---

## Business Rules

The Default Color Variant defines the editorial appearance of the
Outfit.

Changing a Default Color Variant SHALL NOT modify the Product.

Updating Product information SHALL automatically affect every Outfit
referencing that Product.

Removing a Product from the catalog SHALL require all Outfit references
to be resolved before publication.

Outfit Items SHALL inherit Product information dynamically.

They SHALL NOT duplicate Product information.

---

## Lifecycle

Outfit Items inherit the lifecycle of their parent Outfit.

They cannot exist independently.

---

Category

+ Scope

- Product

- Outfit

- Both
