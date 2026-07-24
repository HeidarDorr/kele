\# KELE Website Specification

\## Document Information

\| Field \| Value \|

\|\-\-\-\-\-\-\--\|\-\-\-\-\-\--\|

\| Document \| 00-glossary.md \|

\| Title \| Glossary \|

\| Version \| 1.0 \|

\| Status \| Frozen \|

\| Required By \| All Documents \|

\| Last Updated \| 2026-07-13 \|

\-\--

\# Purpose

This document defines the official terminology used throughout the KELE
website specification.

Every document within this specification SHALL use these definitions
consistently.

\-\--

\# Business Terms

\## Product

A commercial clothing model independent of color, size, inventory and
pricing.

Examples:

\- Jacket

\- Shirt

\- Vest

\- Pants

\- T-Shirt

\- Shorts

\- Shoes

A Product represents the commercial identity of an item.

\-\--

\## Color Variant

A color-specific representation of a Product.

Each Color Variant owns its own image gallery and presentation assets.

Examples:

\- White

\- Navy

\- Cream

\-\--

\## SKU

A Stock Keeping Unit.

A SKU represents the smallest purchasable variation of a Product.

Each SKU is uniquely defined by:

\- Product

\- Color Variant

\- Size

Each SKU maintains its own pricing and inventory.

\-\--

\## Outfit

An independently sellable styling composition created by KELE.

An Outfit consists of one or more Products combined into a curated look.

Unlike a traditional bundle, an Outfit has its own commercial identity,
editorial presentation and pricing strategy.

\-\--

\## Outfit Item

A Product participating in an Outfit.

Outfit Items define composition only.

They do not own pricing, inventory or product information.

\-\--

\## Category

A navigational object used to organize Products and Outfits.

Categories improve customer discovery but do not own catalog content.

\-\--

\## Inventory

The authoritative record representing the available stock quantity of a
SKU.

Inventory is always managed at SKU level.

\-\--

\## Customer

An authenticated shopper interacting with the KELE platform.

Customers may place Orders, submit Reviews and manage Addresses.

\-\--

\## Order

A completed purchase transaction.

Orders preserve historical snapshots of purchased items regardless of
future catalog changes.

\-\--

\## Review

Customer feedback submitted for a Product.

Reviews require administrator approval before public publication.

\-\--

\## Journal

Editorial content published by KELE.

Journal Articles support storytelling, customer education and SEO.

\-\--

\# Publication States

\## Draft

Visible only within the Administration Panel.

Draft objects are incomplete and cannot appear publicly.

\-\--

\## Published

Visible on the public website.

Published objects are eligible for customer interaction.

\-\--

\## Archived

Hidden from customers while remaining available for historical reference
and administrative management.

\-\--

\# Pricing Terms

\## Pricing

Commercial pricing information associated with a purchasable object.

Pricing rules are defined in \`02-business-rules.md\`.

\-\--

\# Inventory Terms

\## Available

A purchasable state indicating sufficient inventory exists.

Availability rules are defined in \`02-business-rules.md\`.

\-\--

\## Out of Scope

This document intentionally does not define:

\- Pricing calculations

\- Inventory calculations

\- Publication workflows

\- Checkout logic

\- Discount rules

\- Shipping rules

These topics are specified in dedicated documents.
