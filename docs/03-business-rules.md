# KELE Website Specification

## Document Information

| Field | Value |

|--------|-------|

| Document | 03-business-rules.md |

| Title | Business Rules |

| Version | 1.0 |

| Status | Draft |

| Depends On | 00-glossary.md, 02-domain-model.md |

| Last Updated | 2026-07-13 |

---

> Hardening note (2026-07-24): ADR-0004 moves `Pending Payment` from the Order
> lifecycle to CheckoutSession/PaymentAttempt while preserving ORD-001. See
> `requirements-traceability.md` for implementation ownership and test
> evidence.


# Purpose

This document defines the business behavior of the KELE ecommerce
platform.

Unlike the Domain Model, which defines business objects, this document
specifies how those objects behave.

All application logic SHALL comply with the rules defined in this
document.

---

# Rule Priority

The following requirement levels are used throughout this document.

| Level | Meaning |

|--------|---------|

| SHALL | Mandatory |

| SHOULD | Recommended |

| MAY | Optional |

---

# 1. Catalog Rules

---

## CAT-001

### Statement

Products and Outfits SHALL be treated as independent catalog objects.

### Impacted Objects

- Product

- Outfit

### Priority

SHALL

---

## CAT-002

### Statement

A Product MAY belong to multiple Categories.

An Outfit MAY belong to multiple Categories.

### Impacted Objects

- Product

- Outfit

- Category

### Priority

SHALL

---

## CAT-003

### Statement

Categories SHALL organize catalog content only.

They SHALL NOT own Products or Outfits.

### Impacted Objects

- Category

### Priority

SHALL

---

## CAT-004

### Statement

Frontend MAY present Color Variants as independent catalog cards.

Backend SHALL continue treating them as variants of the same Product.

### Impacted Objects

- Product

- Color Variant

### Priority

SHALL

---

## CAT-005

### Statement

Deleting a Category SHALL NOT affect any Product or Outfit.

### Impacted Objects

- Category

### Priority

SHALL

# 2. Publication Rules

Publication Rules define when business objects become publicly
available.

Publication state affects visibility but does not affect historical
business data.

---

## PUB-001

### Statement

Every publishable business object SHALL support the following
publication states:

- Draft

- Published

- Archived

### Impacted Objects

- Product

- Color Variant

- SKU

- Outfit

- Category

- Journal Article

### Priority

SHALL

---

## PUB-002

### Statement

Draft objects SHALL NOT be visible on the public website.

Draft objects MAY remain incomplete.

Mandatory information is only required before publication.

### Impacted Objects

- All Publishable Objects

### Priority

SHALL

---

## PUB-003

### Statement

Published objects SHALL become publicly visible immediately after
publication.

No additional approval workflow is required.

### Impacted Objects

- All Publishable Objects

### Priority

SHALL

---

## PUB-004

### Statement

Archived objects SHALL be hidden from customers while remaining fully
available inside the Administration Panel.

Historical references SHALL remain valid.

### Impacted Objects

- All Publishable Objects

### Priority

SHALL

---

## PUB-005

### Statement

Deleting a published object SHALL NOT be permitted if the object is
referenced by historical Orders.

Archiving SHALL be used instead.

### Impacted Objects

- Product

- SKU

- Outfit

### Priority

SHALL

---

## PUB-006

### Statement

A Product SHALL NOT be published unless:

- At least one Category is assigned.

- At least one Color Variant exists.

- At least one SKU exists.

### Impacted Objects

- Product

### Priority

SHALL

---

## PUB-007

### Statement

A Color Variant SHALL NOT be published unless:

- Its parent Product exists.

- At least one SKU exists.

- At least one image has been assigned.

### Impacted Objects

- Color Variant

### Priority

SHALL

---

## PUB-008

### Statement

A SKU SHALL NOT be published unless:

- Its parent Product is Published.

- Its parent Color Variant is Published.

- A selling price has been defined.

Inventory MAY be zero.

Publication and stock availability are independent concepts.

### Impacted Objects

- SKU

### Priority

SHALL

---

## PUB-009

### Statement

An Outfit SHALL NOT be published unless:

- At least one Outfit Item exists.

- Every referenced Product exists.

- Pricing has been configured.

- At least one editorial image has been assigned.

### Impacted Objects

- Outfit

### Priority

SHALL

---

## PUB-010

### Statement

Publication SHALL NOT modify inventory, pricing or historical business
data.

Publishing only changes public visibility.

### Impacted Objects

- All Publishable Objects

### Priority

SHALL

---

## PUB-011

### Statement

Changes made to Published objects SHALL become visible immediately after
saving.

No manual deployment or cache refresh SHALL be required from
administrators.

### Impacted Objects

- All Publishable Objects

### Priority

SHALL

# 3. Pricing Rules

Pricing Rules define how purchasable objects receive, maintain and apply
pricing.

Pricing is always evaluated immediately before payment.

---

## PRC-001

### Statement

Every Product SKU SHALL maintain its own selling price.

Pricing SHALL be assigned at SKU level.

### Impacted Objects

- SKU

### Priority

SHALL

---

## PRC-002

### Statement

Every Outfit SHALL maintain pricing independently from its constituent
Products.

Outfit pricing SHALL NOT be calculated as the sum of Product prices.

### Impacted Objects

- Outfit

### Priority

SHALL

---

## PRC-003

### Statement

Every supported Outfit Size SHALL define its own selling price.

Different Outfit Sizes MAY have different prices.

### Impacted Objects

- Outfit

### Priority

SHALL

---

## PRC-004

### Statement

Changing the selling price of one SKU SHALL NOT affect any other SKU.

Pricing SHALL always be managed independently.

### Impacted Objects

- SKU

### Priority

SHALL

---

## PRC-005

### Statement

Changing the selling price of one Outfit Size SHALL NOT affect any other
Outfit Size.

### Impacted Objects

- Outfit

### Priority

SHALL

---

## PRC-006

### Statement

The final payable amount SHALL be calculated immediately before payment.

Prices displayed in the Shopping Cart SHALL be considered informational
until payment begins.

### Impacted Objects

- Cart

- Checkout

- SKU

- Outfit

### Priority

SHALL

---

## PRC-007

### Statement

If the selling price changes while an item exists inside a Shopping
Cart, the new price SHALL automatically apply during Checkout.

No previous price SHALL be guaranteed.

### Impacted Objects

- Cart

- Checkout

### Priority

SHALL

---

## PRC-008

### Statement

The Administration Panel SHALL support bulk price updates based on
configurable filters.

Supported filters SHOULD include:

- Category

- Product Type

- Publication Status

- Size

- Brand Collection (Future)

- Manual Selection

Price adjustment MAY be defined as:

- Fixed Amount

- Percentage Increase

- Percentage Decrease

### Impacted Objects

- SKU

- Outfit

### Priority

SHOULD

---

## PRC-009

### Statement

Every pricing modification SHALL be recorded in the Audit History.

Each pricing log SHALL include:

- Timestamp

- User

- Previous Price

- New Price

- Modified Object

- Reason (Optional)

### Impacted Objects

- SKU

- Outfit

### Priority

SHALL

---

## PRC-010

### Statement

Pricing SHALL be manually managed through the Administration Panel.

No automatic pricing engine is included in the current system scope.

### Impacted Objects

- SKU

- Outfit

### Priority

SHALL

# 4. Inventory Rules

Inventory Rules define how stock quantities are maintained, reserved and
consumed throughout the purchasing lifecycle.

Inventory SHALL always be managed at SKU level.

---

## INV-001

### Statement

Inventory SHALL be maintained exclusively for Product SKUs.

Neither Products nor Outfits SHALL own independent inventory.

### Impacted Objects

- Inventory

- SKU

- Product

- Outfit

### Priority

SHALL

---

## INV-002

### Statement

Every inventory record SHALL maintain the following values:

- Physical Quantity

- Reserved Quantity

Available Quantity SHALL always be calculated as:

Physical Quantity − Reserved Quantity

Available Quantity SHALL NOT be stored independently.

### Impacted Objects

- Inventory

### Priority

SHALL

---

## INV-003

### Statement

Adding an item to the Shopping Cart SHALL NOT reserve inventory.

Inventory reservation SHALL begin only when the customer enters
Checkout.

### Impacted Objects

- Cart

- Checkout

- Inventory

### Priority

SHALL

---

## INV-004

### Statement

Before entering Checkout, the system SHALL validate inventory
availability for every requested SKU.

If any SKU is unavailable, Checkout SHALL be rejected.

### Impacted Objects

- Checkout

- Inventory

### Priority

SHALL

---

## INV-005

### Statement

Successful entry into Checkout SHALL create an inventory reservation.

Reservation SHALL reduce Available Quantity without changing Physical
Quantity.

### Impacted Objects

- Checkout

- Inventory

### Priority

SHALL

---

## INV-006

### Statement

Inventory reservations SHALL expire automatically after 30 minutes
unless payment has been completed.

Expired reservations SHALL immediately restore Available Quantity.

Shopping Cart contents SHALL remain unchanged.

### Impacted Objects

- Reservation

- Inventory

- Cart

### Priority

SHALL

---

## INV-007

### Statement

Payment completion SHALL convert an active reservation into a completed
sale.

Reserved Quantity SHALL decrease.

Physical Quantity SHALL decrease.

### Impacted Objects

- Inventory

- Order

### Priority

SHALL

---

## INV-008

### Statement

Inventory SHALL only be modified through predefined Inventory Actions.

Direct modification of inventory quantities SHALL NOT be permitted.

### Impacted Objects

- Inventory

### Priority

SHALL

---

## INV-009

### Statement

The system SHALL support the following Inventory Actions:

- Production

- Sale

- Customer Return

- Manual Correction

- Damaged Goods

Additional Inventory Actions MAY be introduced in future versions.

### Impacted Objects

- Inventory

### Priority

SHALL

---

## INV-010

### Statement

Every Inventory Action SHALL generate an Audit Event.

Each event SHALL record:

- Timestamp

- User

- Inventory Action

- SKU

- Quantity

- Previous Physical Quantity

- New Physical Quantity

- Related Order (Optional)

- Reason (Required)

### Impacted Objects

- Inventory

- Audit

### Priority

SHALL

---

## INV-011

### Statement

Customer Returns SHALL be processed through the Order Management
workflow.

Inventory SHALL NOT be increased directly.

The system SHALL execute all business effects associated with a return,
including inventory restoration and financial adjustments.

### Impacted Objects

- Order

- Inventory

### Priority

SHALL

---

## INV-012

### Statement

Production inventory updates SHALL increase Physical Quantity only.

Production events SHALL NOT modify financial reports or Order history.

### Impacted Objects

- Inventory

### Priority

SHALL

---

## INV-013

### Statement

Manual Corrections SHALL be permitted only for authorized administrative
users.

Every Manual Correction SHALL require a mandatory reason.

### Impacted Objects

- Inventory

- User Permissions

### Priority

SHALL

---

## INV-014

### Statement

Inventory calculations SHALL remain consistent regardless of sales
channel.

Website Orders, Instagram Sales and future ERP integrations SHALL use
the same inventory engine.

### Impacted Objects

- Inventory

- Order

### Priority

SHALL

---

## INV-015

### Statement

Outfit availability SHALL be calculated dynamically.

An Outfit Size SHALL be considered available only when every required
Product SKU for that size is available.

### Impacted Objects

- Outfit

- Inventory

### Priority

SHALL

---

## INV-016

### Statement

The available size range of an Outfit SHALL be determined by the
intersection of the supported size ranges of all required Products.

### Impacted Objects

- Outfit

### Priority

SHALL

---

## INV-017

### Statement

Inventory SHALL be the single source of truth for product availability.

No other object SHALL independently determine stock availability.

### Impacted Objects

- Inventory

- Product

- SKU

- Outfit

### Priority

SHALL

# 5. Outfit Rules

Outfit Rules define how curated styling compositions are created,
managed and sold.

An Outfit represents an independent commercial product composed of
multiple Products.

---

## OTF-001

### Statement

An Outfit SHALL be created by selecting one or more existing Products.

Products SHALL always exist before an Outfit can be created.

### Impacted Objects

- Outfit

- Product

### Priority

SHALL

---

## OTF-002

### Statement

A Product MAY participate in multiple Outfits.

No ownership relationship SHALL exist between a Product and a single
Outfit.

### Impacted Objects

- Product

- Outfit

### Priority

SHALL

---

## OTF-003

### Statement

An Outfit SHALL maintain its own commercial identity independent of its
constituent Products.

Outfit presentation, editorial assets and pricing SHALL be managed
independently.

### Impacted Objects

- Outfit

### Priority

SHALL

---

## OTF-004

### Statement

Outfit pricing SHALL be configured independently for each supported
size.

Outfit prices SHALL NOT be derived from Product prices.

### Impacted Objects

- Outfit

### Priority

SHALL

---

## OTF-005

### Statement

An Outfit SHALL NOT support Color Variants.

Color selection SHALL only exist at Product level.

### Impacted Objects

- Outfit

### Priority

SHALL

---

## OTF-006

### Statement

The available sizes of an Outfit SHALL be determined automatically by
the intersection of the supported sizes of all required Products.

Manual size definition SHALL NOT be permitted.

### Impacted Objects

- Outfit

### Priority

SHALL

---

## OTF-007

### Statement

For each Outfit Size, availability SHALL be determined dynamically based
on the availability of every required Product SKU.

If any required SKU is unavailable, the corresponding Outfit Size SHALL
be unavailable.

### Impacted Objects

- Outfit

- Inventory

### Priority

SHALL

---

## OTF-008

### Statement

Customers SHALL be able to purchase an Outfit only as originally
curated.

Modification of Outfit composition SHALL NOT be permitted.

### Impacted Objects

- Outfit

- Cart

### Priority

SHALL

---

## OTF-009

### Statement

The Outfit Product Detail Page SHALL present all constituent Products
individually.

Each Product SHALL remain independently purchasable.

### Impacted Objects

- Outfit

- Product

### Priority

SHALL

---

## OTF-010

### Statement

Purchasing individual Products SHALL NOT modify the composition or
pricing of the Outfit.

### Impacted Objects

- Outfit

- Product

### Priority

SHALL

---

## OTF-011

### Statement

Editorial images MAY be associated with an Outfit.

Homepage editorial content MAY navigate directly to the corresponding
Outfit.

### Impacted Objects

- Outfit

- Homepage CMS

### Priority

SHALL

---

## OTF-012

### Statement

Removing a Product from an Outfit SHALL immediately affect Outfit
availability and supported sizes.

### Impacted Objects

- Outfit

### Priority

SHALL

---

## OTF-013

### Statement

Publishing an Outfit SHALL NOT require its constituent Products to be
purchased together elsewhere.

Products SHALL remain fully independent commercial objects.

### Impacted Objects

- Outfit

- Product

### Priority

SHALL

# 6. Customer Rules

Customer Rules define how customers interact with the KELE platform.

These rules govern authentication, profile ownership and
customer-generated content.

---

## CUS-001

### Statement

Customers MAY browse the catalog without authentication.

Authentication SHALL only be required when performing customer-specific
actions.

### Impacted Objects

- Customer

### Priority

SHALL

---

## CUS-002

### Statement

Authentication SHALL be required before:

- Placing an Order

- Saving Addresses

- Viewing Order History

- Submitting Reviews

- Managing Personal Information

- Receiving Stock Availability Notifications

### Impacted Objects

- Customer

- Order

- Review

### Priority

SHALL

---

## CUS-003

### Statement

Each Customer SHALL maintain an independent profile.

Customer data SHALL NOT be shared between accounts.

### Impacted Objects

- Customer

### Priority

SHALL

---

## CUS-004

### Statement

Each Customer MAY maintain multiple delivery addresses.

One address MAY be designated as the default delivery address.

### Impacted Objects

- Customer

### Priority

SHALL

---

## CUS-005

### Statement

Customers SHALL only access their own Orders, Reviews, Addresses and
Personal Information.

Administrative authorization SHALL be required to access customer
information belonging to other users.

### Impacted Objects

- Customer

- Order

- Review

### Priority

SHALL

---

## CUS-006

### Statement

Customers MAY subscribe to stock availability notifications for
unavailable SKUs.

Notifications SHALL be sent automatically when the SKU becomes available
again.

### Impacted Objects

- Customer

- SKU

### Priority

SHALL

---

## CUS-007

### Statement

A Customer MAY subscribe only once to the same SKU availability
notification.

Duplicate subscriptions SHALL NOT be permitted.

### Impacted Objects

- Customer

- SKU

### Priority

SHALL

---

## CUS-008

### Statement

Customers SHALL be able to update their profile information.

Profile modifications SHALL NOT affect historical Orders.

### Impacted Objects

- Customer

- Order

### Priority

SHALL

---

## CUS-009

### Statement

Deleting a Customer account SHALL NOT remove historical Orders.

Historical business records SHALL remain immutable.

### Impacted Objects

- Customer

- Order

### Priority

SHALL

---

## CUS-010

### Statement

Customer authentication SHALL be performed using mobile phone number
verification.

Password-based authentication is out of scope for the current system
version.

### Impacted Objects

- Customer

### Priority

SHALL

# 7. Cart Rules

Cart Rules define how customers collect Products and Outfits prior to
Checkout.

The Shopping Cart is a temporary customer workspace and SHALL NOT
represent a reservation of inventory.

---

## CRT-001

### Statement

Customers MAY add both Products and Outfits to the same Shopping Cart.

### Impacted Objects

- Cart

- Product

- Outfit

### Priority

SHALL

---

## CRT-002

### Statement

Adding an item to the Shopping Cart SHALL NOT reserve inventory.

Inventory reservation SHALL begin only after the customer successfully
enters Checkout.

### Impacted Objects

- Cart

- Inventory

### Priority

SHALL

---

## CRT-003

### Statement

The Shopping Cart SHALL allow quantity modification for both Product
SKUs and Outfits.

Inventory validation SHALL be performed independently for every required
SKU based on the requested quantity.

For Outfit purchases, the requested quantity SHALL be validated against
the availability of every Product SKU composing the Outfit.

### Impacted Objects

- Cart

- Product

- Outfit

- Inventory

### Priority

SHALL

## CRT-004

### Statement

Before Checkout begins, the system SHALL validate:

- Product publication status

- SKU availability

- Outfit availability

- Current pricing

If any validation fails, Checkout SHALL be rejected.

### Impacted Objects

- Cart

- Checkout

### Priority

SHALL

---

## CRT-005

### Statement

Successful entry into Checkout SHALL create inventory reservations for
all purchasable SKUs.

Reservations SHALL remain valid for 30 minutes.

### Impacted Objects

- Checkout

- Inventory

### Priority

SHALL

---

## CRT-006

### Statement

Expired reservations SHALL automatically release reserved inventory.

Shopping Cart contents SHALL remain unchanged.

### Impacted Objects

- Cart

- Inventory

### Priority

SHALL

---

## CRT-007

### Statement

Prices displayed in the Shopping Cart SHALL be informational only.

The final payable amount SHALL always be recalculated immediately before
payment.

### Impacted Objects

- Cart

- Checkout

### Priority

SHALL

---

## CRT-008

### Statement

If any Cart item becomes unavailable before Checkout begins, the
customer SHALL be informed before reservation is attempted.

### Impacted Objects

- Cart

- Inventory

### Priority

SHALL

---

## CRT-009

### Statement

Customers MAY remove individual line items from the Shopping Cart at any
time.

Removing a line item SHALL immediately release any active reservation
associated with that item.

### Impacted Objects

- Cart

- Inventory

### Priority

SHALL

---

## CRT-010

### Statement

The Shopping Cart SHALL persist across customer sessions until manually
cleared, successfully purchased or administratively removed.

### Impacted Objects

- Cart

### Priority

SHALL

# 8. Order Rules

Order Rules define the lifecycle of customer purchases from successful
payment through fulfillment, cancellation and return.

An Order represents the official commercial record of a completed
purchase.

---

## ORD-001

### Statement

An Order SHALL be created only after successful payment confirmation.

Failed or abandoned payments SHALL NOT create Orders.

### Impacted Objects

- Order

- Payment

### Priority

SHALL

---

## ORD-002

### Statement

Every Order SHALL receive a unique Order Number.

Order Numbers SHALL remain immutable.

### Impacted Objects

- Order

### Priority

SHALL

---

## ORD-003

### Statement

Once created, an Order SHALL permanently preserve:

- Purchased Items

- Purchased Quantities

- Unit Prices

- Final Paid Amount

Subsequent catalog changes SHALL NOT modify historical Orders.

### Impacted Objects

- Order

### Priority

SHALL

---

## ORD-004

### Statement

Successful payment SHALL convert all active inventory reservations into
completed inventory deductions.

### Impacted Objects

- Order

- Inventory

### Priority

SHALL

---

## ORD-005

### Statement

Customers SHALL NOT cancel Orders directly.

Order cancellation SHALL be performed only by authorized administrators
through the Administration Panel.

### Impacted Objects

- Order

- Customer

### Priority

SHALL

---

## ORD-006

### Statement

Cancelling an Order SHALL execute all associated business operations
automatically, including:

- Inventory restoration

- Revenue adjustment

- Order status update

- Business Event logging

Manual inventory modification SHALL NOT be required.

### Impacted Objects

- Order

- Inventory

### Priority

SHALL

---

## ORD-007

### Statement

Customer Returns SHALL be processed exclusively through the Order
workflow.

Direct inventory increases SHALL NOT be permitted.

### Impacted Objects

- Order

- Inventory

### Priority

SHALL

---

## ORD-008

### Statement

Returned items SHALL automatically:

- Restore inventory

- Reduce recognized revenue

- Generate Business Events

- Preserve historical Order records

### Impacted Objects

- Order

- Inventory

### Priority

SHALL

---

## ORD-009

### Statement

Every Order SHALL maintain a lifecycle status.

The initial supported statuses SHALL include:

- Pending Payment

- Paid

- Preparing

- Shipped

- Delivered

- Cancelled

- Returned

### Impacted Objects

- Order

### Priority

SHALL

---

## ORD-010

### Statement

Order status changes SHALL generate Business Events and SHALL be
recorded in the Audit History.

### Impacted Objects

- Order

- Business Events

### Priority

SHALL

---

## ORD-011

### Statement

Every Order SHALL define exactly one delivery method.

The initial supported delivery methods SHALL include:

- Postal Service

- Tipax

- Tehran Courier

Additional delivery methods MAY be introduced in future versions.

### Impacted Objects

- Order

- Shipment

### Priority

SHALL

---

## ORD-012

### Statement

Delivery costs SHALL be calculated independently from Product pricing.

Shipment pricing SHALL NOT modify Product or Outfit prices.

### Impacted Objects

- Order

- Shipment

### Priority

SHALL

---

## ORD-013

### Statement

Shipment tracking information MAY be attached to an Order after
dispatch.

Tracking information SHALL remain editable by authorized administrators.

### Impacted Objects

- Shipment

- Order

### Priority

SHALL

---

## ORD-014

### Statement

Shipment progress SHALL be maintained independently from Order payment
status.

Shipment status SHALL NOT modify financial records.

### Impacted Objects

- Shipment

### Priority

SHALL

---

## ORD-015

### Statement

Customers SHALL be able to view the current shipment status from their
Order History.

### Impacted Objects

- Shipment

- Customer

### Priority

SHALL

---

## ORD-016

### Statement

If shipment cannot be completed using available delivery methods, Order
fulfillment MAY continue through Customer Support.

Such Orders SHALL remain fully traceable through Business Events.

### Impacted Objects

- Order

- Shipment

### Priority

SHALL

---

## ORD-017

### Statement

Shipment status changes SHALL generate Business Events.

Every shipment event SHALL include:

- Timestamp

- User

- Previous Status

- New Status

- Related Order

### Impacted Objects

- Shipment

- Business Events

### Priority

SHALL

# 9. Review Rules

Review Rules define how customers submit and interact with product
reviews.

Reviews contribute to customer trust while remaining subject to
administrative moderation.

---

## REV-001

### Statement

Only authenticated Customers SHALL be permitted to submit Reviews.

### Impacted Objects

- Customer

- Review

### Priority

SHALL

---

## REV-002

### Statement

A Review SHALL be associated with exactly one Product or one Outfit.

Reviews SHALL NOT be shared across multiple catalog objects.

### Impacted Objects

- Review

- Product

- Outfit

### Priority

SHALL

---

## REV-003

### Statement

Customers MAY submit multiple Reviews over time for the same Product or
Outfit.

Each new Review SHALL remain an independent historical record.

### Impacted Objects

- Customer

- Review

### Priority

SHALL

---

## REV-004

### Statement

Newly submitted Reviews SHALL require administrative approval before
becoming publicly visible.

### Impacted Objects

- Review

### Priority

SHALL

---

## REV-005

### Statement

Rejected Reviews SHALL remain available within the Administration Panel.

Rejected Reviews SHALL NOT be publicly visible.

### Impacted Objects

- Review

### Priority

SHALL

---

## REV-006

### Statement

Administrators MAY edit Review visibility status.

The original customer content SHALL remain preserved in Business Events.

### Impacted Objects

- Review

- Business Events

### Priority

SHALL

---

## REV-007

### Statement

Deleting a Review SHALL NOT remove its historical moderation records.

### Impacted Objects

- Review

- Business Events

### Priority

SHALL

---

## REV-008

### Statement

Customers SHALL NOT edit Reviews after submission.

If a correction is required, a new Review SHALL be submitted.

### Impacted Objects

- Review

### Priority

SHALL

---

## REV-009

### Statement

Reviews MAY include:

- Rating

- Title

- Comment

Image attachments are out of scope for the current system version.

### Impacted Objects

- Review

### Priority

SHALL

---

## REV-010

### Statement

Published Reviews SHALL remain publicly visible unless removed by
authorized administrators.

### Impacted Objects

- Review

### Priority

SHALL

## REV-011

### Statement

Reviews submitted by Customers who have previously purchased the
reviewed Product or Outfit SHALL be identified as Verified Purchase.

Verification SHALL be determined automatically based on completed
Orders.

### Impacted Objects

- Review

- Customer

- Order

### Priority

SHALL

# 10. CMS Rules

CMS Rules define how administrative users manage commercial, editorial
and system content.

The Administration Panel SHALL provide a unified interface for managing
all business objects.

---

## CMS-001

### Statement

The Administration Panel SHALL be organized into three functional
domains:

- Commerce

- Editorial

- System

### Impacted Objects

- Administration Panel

### Priority

SHALL

---

## CMS-002

### Statement

The system SHALL support the following administrative roles:

- Super Admin

- Inventory Admin

- Instagram Admin

The permission model SHALL remain extensible for future roles.

### Impacted Objects

- User

- Permission

### Priority

SHALL

---

## CMS-003

### Statement

Only Super Administrators SHALL manage Products, Outfits, Categories,
Homepage content, Journal articles and Site Settings.

### Impacted Objects

- User

- Product

- Outfit

- Category

- Homepage

- Journal

### Priority

SHALL

---

## CMS-004

### Statement

Inventory Administrators SHALL only manage Inventory Actions and
inventory-related operations.

They SHALL NOT modify commercial catalog information.

### Impacted Objects

- Inventory

- User

### Priority

SHALL

---

## CMS-005

### Statement

Instagram Administrators SHALL only perform inventory changes generated
by Instagram sales and customer returns.

Instagram Administrators SHALL NOT modify Products, Orders, Pricing or
Editorial content.

### Impacted Objects

- Inventory

- User

### Priority

SHALL

---

## CMS-006

### Statement

The Homepage SHALL support configurable editorial sections.

Changes SHALL become publicly visible immediately after saving.

Draft mode is out of scope for Homepage management.

### Impacted Objects

- Homepage

### Priority

SHALL

---

## CMS-007

### Statement

Homepage editorial items MAY link directly to an Outfit or a Product.

The destination SHALL be configurable by administrators.

### Impacted Objects

- Homepage

- Outfit

- Product

### Priority

SHALL

---

## CMS-008

### Statement

The system SHALL provide a centralized Media Library.

Media assets MAY be reused across multiple business objects.

### Impacted Objects

- Media Library

### Priority

SHALL

---

## CMS-009

### Statement

Media assets SHALL support logical grouping, including but not limited
to:

- Product Images

- Outfit Editorial

- Homepage

- Journal

- Shared Assets

### Impacted Objects

- Media Library

### Priority

SHALL

---

## CMS-010

### Statement

Categories SHALL support configurable display order.

Display order SHALL NOT affect business relationships.

### Impacted Objects

- Category

### Priority

SHALL

---

## CMS-011

### Statement

Journal Articles SHALL support the following publication lifecycle:

- Draft

- Published

- Archived

Deleting published Journal Articles is discouraged and SHALL require
explicit administrator confirmation.

### Impacted Objects

- Journal

### Priority

SHALL

---

## CMS-012

### Statement

The system SHALL provide centralized Site Settings for managing global
platform configuration.

Site Settings SHALL include, but not be limited to:

- Brand Information

- Contact Information

- Social Links

- Footer Content

- SEO Defaults

- Shipping Settings

- Payment Settings

### Impacted Objects

- Site Settings

### Priority

SHALL

---

## CMS-013

### Statement

Products, Outfits and Journal Articles SHALL support Preview before
publication.

Preview SHALL NOT expose unpublished content to public users.

### Impacted Objects

- Product

- Outfit

- Journal

### Priority

SHALL

---

## CMS-014

### Statement

The Administration Panel SHALL provide search and filtering capabilities
across managed business objects.

Filtering MAY include:

- Status

- Category

- Publication State

- Inventory Status

- Date

- Keyword

### Impacted Objects

- Administration Panel

### Priority

SHALL

---

## CMS-015

### Statement

Bulk Operations SHALL be supported where appropriate, including:

- Price Updates

- Publication

- Archiving

- Category Assignment

All Bulk Operations SHALL generate Business Events.

### Impacted Objects

- Product

- Outfit

- Business Events

### Priority

SHALL

---

## CMS-016

### Statement

Media assets SHALL NOT be permanently deleted while actively referenced
by any business object.

The system SHALL identify all usage locations before allowing deletion.

### Impacted Objects

- Media Library

### Priority

SHALL

---

## CMS-017

### Statement

Administrative actions affecting commercial or editorial data SHALL
generate Business Events.

### Impacted Objects

- Business Events

### Priority

SHALL

---

## CMS-018

### Statement

The Administration Panel SHALL preserve interface simplicity.

Administrative workflows SHALL prioritize clarity and consistency over
minimizing the number of clicks.

### Impacted Objects

- Administration Panel

### Priority

SHALL

# 11. Business Event Rules

Business Events provide a complete historical record of significant
business activities.

Business Events SHALL support operational analysis, auditing and
business intelligence.

---

## EVT-001

### Statement

Every significant business action SHALL generate a Business Event.

### Impacted Objects

- Business Event

### Priority

SHALL

---

## EVT-002

### Statement

Each Business Event SHALL include at minimum:

- Event ID

- Event Type

- Timestamp

- User

- Related Entity

- Related Entity ID

### Impacted Objects

- Business Event

### Priority

SHALL

---

## EVT-003

### Statement

Business Events SHALL be immutable.

Recorded Events SHALL NOT be edited or deleted.

### Impacted Objects

- Business Event

### Priority

SHALL

---

## EVT-004

### Statement

Business Events SHALL support chronological reconstruction of business
activities.

### Impacted Objects

- Business Event

### Priority

SHALL

---

## EVT-005

### Statement

The system SHALL generate Business Events for inventory operations,
including:

- Inventory Increase

- Inventory Decrease

- Reservation

- Reservation Release

- Order Fulfillment

- Customer Return

### Impacted Objects

- Inventory

- Business Event

### Priority

SHALL

---

## EVT-006

### Statement

The system SHALL generate Business Events for pricing operations,
including:

- Price Creation

- Price Modification

- Bulk Price Update

Each event SHALL preserve both previous and new values.

### Impacted Objects

- Price

- Business Event

### Priority

SHALL

---

## EVT-007

### Statement

The system SHALL generate Business Events for catalog operations,
including:

- Product Creation

- Product Publication

- Product Archive

- Product Deletion

- Outfit Creation

- Category Changes

### Impacted Objects

- Product

- Outfit

- Category

### Priority

SHALL

---

## EVT-008

### Statement

Administrative actions affecting Site Settings, Homepage or Journal
content SHALL generate Business Events.

### Impacted Objects

- Site Settings

- Homepage

- Journal

### Priority

SHALL

---

## EVT-009

### Statement

Order lifecycle changes SHALL generate Business Events, including:

- Payment Confirmation

- Shipment Creation

- Shipment Status Change

- Cancellation

- Return

### Impacted Objects

- Order

- Shipment

### Priority

SHALL

---

## EVT-010

### Statement

Business Events SHALL support advanced filtering.

Filtering SHALL include, but not be limited to:

- Date Range

- Event Type

- User

- Entity Type

- Entity Identifier

### Impacted Objects

- Business Event

### Priority

SHALL

---

## EVT-011

### Statement

Business Events SHALL remain accessible for business reporting and
operational analytics.

Historical records SHALL support long-term business decision making.

### Impacted Objects

- Business Event

### Priority

SHALL

---

## EVT-012

### Statement

Business Events SHALL serve as the authoritative source for historical
business analysis.

Operational reports, pricing analysis, inventory analysis and audit
reports SHOULD derive historical information from Business Events
whenever applicable.

### Impacted Objects

- Business Event

- Reporting

### Priority

SHOULD

# 12. Approved Clarification Rules

The following rules incorporate the employer-approved
`Open Questions Resolution v1` dated 2026-07-24. They have the same normative
force as other SHALL rules in this document.

## Localization

## LOC-001

Version 1 SHALL support only Persian (`fa-IR`) customer-facing content and
Right-to-Left layout.

## LOC-002

The architecture SHALL remain locale-ready so future localization does not
require redesign of business modules or persisted business history.

## Payment provider

## PAY-001

Development and automated testing SHALL use a Fake Payment Adapter.

## PAY-002

Payment business logic SHALL depend on a provider-neutral application contract
and SHALL NOT depend directly on a payment provider SDK.

## PAY-003

A production payment provider SHALL be selected, integrated, verified, and
approved before production deployment.

## SMS provider

## SMS-001

Development and automated testing SHALL use a Fake SMS Provider.

## SMS-002

OTP and notification messages SHALL pass through one centralized,
provider-neutral SMS adapter.

## Shipping

## SHP-001

Version 1 SHALL support Iran Post, Tipax, and Local Courier.

## SHP-002

Local Courier SHALL be available only for delivery addresses within Tehran.

## SHP-003

Shipping cost SHALL be paid by the customer unless the Order qualifies for
free shipping.

## SHP-004

Each shipping method SHALL have a configurable fixed price managed through the
Administration Panel.

## SHP-005

The platform SHALL support a configurable free-shipping threshold.

## SHP-006

When the approved eligibility amount equals or exceeds the configured
free-shipping threshold, shipping cost SHALL be zero.

The exact eligibility amount is tracked by OQ-013 and SHALL be resolved before
shipping quote implementation.

## SHP-007

Shipping prices and the free-shipping threshold SHALL be changeable without a
software deployment. Checkout and Order snapshots SHALL preserve the applied
shipping method, price, and policy values.

## Returns

## RTE-001

A Customer MAY submit a return request only within 24 hours after confirmed
delivery.

## RTE-002

A return request SHALL declare that the Product has not been used.

## RTE-003

A return request SHALL declare that the Product has not been washed.

## RTE-004

A return request SHALL declare that original tags and labels remain attached.

## RTE-005

Final return approval SHALL be performed by an authorized Administrator.
Submitting a request SHALL NOT automatically restore inventory or recognize a
refund.

## Outfit clarification

## OTF-014

Every Outfit Revision SHALL explicitly map each supported Outfit Size to the
exact component SKUs and quantities required for that size.

## OTF-015

Outfit inventory SHALL be calculated from the explicit component mapping and
SHALL NOT be stored independently.

## OTF-016

An Outfit reservation SHALL reserve every required component SKU and quantity
simultaneously in one transaction.

## OTF-017

Published Outfit compositions SHALL be immutable.

## OTF-018

Changing a published Outfit composition SHALL create a new Outfit Revision.
Historical Outfit Revisions SHALL never be modified.

## Guest cart clarification

## CRT-011

Anonymous visitors MAY create and manage a Shopping Cart.

## CRT-012

Customer authentication SHALL be required before Checkout begins.

## CRT-013

After successful authentication, the Guest Cart SHALL merge into the
authenticated Customer Cart using deterministic rules. The exact conflict and
quantity algorithm is tracked by OQ-014 and SHALL be resolved before merge
implementation.

## Version 1 scope exclusions

## SCP-001

Wishlist APIs, UI, and Administration functionality SHALL NOT be implemented
in version 1.

## SCP-002

Newsletter and marketing-subscription functionality SHALL NOT be implemented
in version 1.

## Currency clarification

## PRC-011

All persisted prices, calculations, payment reconciliation, and commercial
snapshots SHALL use Iranian Rial (`IRR`) as the single canonical monetary unit.

## PRC-012

The customer interface MAY display prices in toman. Conversion between rial and
toman SHALL be centralized, exact, and covered by automated tests.

## Order address clarification

## ORD-018

Every Order SHALL preserve an immutable snapshot of its shipping address.
Changes to the Customer Address Book SHALL NOT modify historical Orders.

## Search clarification

## CAT-006

Version 1 SHALL use PostgreSQL-backed catalog search. A dedicated search engine
is outside version 1.

## Reservation clarification

## INV-018

Reservation SHALL occur at SKU level. If any Product or Outfit component SKU
cannot be reserved, the entire requested line reservation SHALL fail without
leaving a partial reservation.
