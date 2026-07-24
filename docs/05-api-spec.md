\# 04-api-spec.md

\# API Specification

Version: 1.0

Status: Draft

\# 1. Purpose

This document defines the official communication contract between the
Storefront, Administration Panel and Backend services.

The specification SHALL be treated as the single source of truth for API
behavior.

Every endpoint defined in this document SHALL comply with the Business
Rules and Domain Model defined in previous specifications.

This document is intended for:

\- Backend Developers

\- Frontend Developers

\- QA Engineers

-   AI Development Agents

\# 2. Design Principles

The API SHALL be:

\- Resource-oriented

\- Stateless

\- Versioned

\- Predictable

\- Consistent

\- Backward-compatible whenever possible

Business Rules SHALL be enforced by the Backend.

Frontend applications SHALL NOT implement business logic.

Every endpoint SHALL produce deterministic responses for identical
requests.

Validation SHALL always occur on the Backend.

\# 3. API Versioning

The API SHALL be versioned.

Initial Version:

v1

Example:

/api/v1/products

Future breaking changes SHALL require a new API version.

Non-breaking changes SHOULD preserve backward compatibility.

\# 4. Authentication

Storefront APIs

Authentication:

OTP Access Token

Administration APIs

Authentication:

Administrator Access Token

Every authenticated request SHALL include:

Authorization

Bearer \<token\>

\# 5. Request Standards

Every request SHALL use JSON unless otherwise specified.

Request bodies SHALL use camelCase naming.

Example

{

\"productName\": \"\...\",

\"categoryIds\": \[\],

\"description\": \"\...\"

}

\-\--

Query Parameters SHALL also use camelCase.

Example

?page=1&pageSize=20&sortBy=name

\-\--

Identifiers SHALL be passed as URL Parameters.

Example

GET /products/{productId}

\# 6. Response Standards

Successful responses SHALL follow a consistent structure.

Example

{

\"success\": true,

\"data\": {},

\"meta\": {}

}

\-\--

Error responses SHALL follow the same structure.

Example

{

\"success\": false,

\"error\": {

\"code\": \"\...\",

\"message\": \"\...\",

\"details\": \[\]

}

}

\# 7. Error Handling

Every Business Error SHALL expose:

\- Error Code

\- Human-readable Message

Validation Errors SHOULD include affected fields.

Example

{

\"success\": false,

\"error\": {

\"code\": \"PRODUCT_NOT_PUBLISHABLE\",

\"message\": \"Product cannot be published.\",

\"details\": \[

\"Missing Images\",

\"Missing Price\"

\]

}

}

\# 8. Pagination

List endpoints SHALL support pagination.

Supported Parameters

page

pageSize

Response Metadata

{

\"meta\": {

\"page\": 1,

\"pageSize\": 20,

\"totalItems\": 132,

\"totalPages\": 7

}

}

\# 9. Filtering & Sorting

Collection endpoints SHOULD support filtering.

Supported Parameters

search

sortBy

sortDirection

status

categoryId

Additional filters MAY be introduced by individual resources.

Example

GET /products?page=1&pageSize=20&search=shirt&status=published

\# 10. Resource Overview

The API exposes the following Resources.

\-\--

Commerce

\- Categories

\- Products

\- Outfits

\- Inventory

\- Pricing

\-\--

Editorial

\- Homepage

\- Journal

\- Media

\-\--

Sales

\- Cart

\- Checkout

\- Orders

\- Returns

\-\--

System

\- Users

\- Settings

-   Authentication

\# 11. Product Resource

\## Purpose

Provides CRUD operations for Product management.

Pricing and Inventory are managed through dedicated Resources.

\-\--

Supported Operations

\- Create Product

\- Get Product

\- List Products

\- Update Product

\- Delete Product

\- Publish Product

-   Archive Product

\### Create Product

POST

/api/v1/products

Permission

Super Admin

\-\--

\### List Products

GET

/api/v1/products

Supports

\- Pagination

\- Filtering

\- Sorting

\- Search

\-\--

\### Get Product

GET

/api/v1/products/{productId}

\-\--

\### Update Product

PATCH

/api/v1/products/{productId}

\-\--

\### Delete Product

DELETE

/api/v1/products/{productId}

\-\--

\### Publish Product

POST

/api/v1/products/{productId}/publish

\-\--

\### Archive Product

POST

/api/v1/products/{productId}/archive

\## Create Product

\### Endpoint

POST /api/v1/products

\-\--

\### Purpose

Creates a new Draft Product.

The Product SHALL be created with Status = Draft.

\-\--

\### Permission

Super Admin

\-\--

\### Request

{

\"name\": \"\...\",

\"categoryIds\": \[\],

\"description\": \"\...\",

\"colors\": \[\]

}

\-\--

\### Validation

\- Product Name is required.

\- At least one Category is required.

\- Duplicate Product Name is allowed.

\- Category IDs must exist.

\-\--

\### Business Rules

Product SHALL be created as Draft.

Pricing SHALL NOT be created automatically.

Inventory SHALL NOT be created automatically.

Publication SHALL require a separate operation.

\-\--

\### Success Response

201 Created

{

\"success\": true,

\"data\": {

\"productId\": \"\...\",

\"status\": \"Draft\"

}

}

\-\--

\### Possible Errors

INVALID_CATEGORY

INVALID_REQUEST

UNAUTHORIZED

\-\--

\### Business Events

ProductCreated

\## Get Product

\### Endpoint

GET /api/v1/products/{productId}

\-\--

\### Purpose

Returns complete Product information.

\-\--

\### Permission

Authenticated Administrator

\-\--

\### Success Response

200 OK

{

\"success\": true,

\"data\": {

\...

}

}

\-\--

\### Possible Errors

PRODUCT_NOT_FOUND

UNAUTHORIZED

\## List Products

\### Endpoint

GET /api/v1/products

\-\--

\### Purpose

Returns paginated Products.

\-\--

\### Permission

Authenticated Administrator

\-\--

\### Supports

\- Pagination

\- Search

\- Filtering

\- Sorting

\-\--

\### Filters

categoryIds

status

search

sortBy

sortDirection

\## Update Product

\### Endpoint

PATCH /api/v1/products/{productId}

\-\--

\### Purpose

Updates editable Product information.

Only Draft or Archived Products MAY be updated.

Published Products SHALL NOT allow structural modifications.

\-\--

\### Permission

Super Admin

\-\--

\### Validation

\- Product must exist.

\- Category IDs must exist.

\- Immutable fields SHALL NOT be modified.

\-\--

\### Business Rules

Updating a Product SHALL NOT modify:

\- Inventory

\- Pricing

\- Published Outfit compositions

\-\--

\### Success Response

200 OK

{

\"success\": true,

\"data\": {

\"productId\": \"\...\",

\"status\": \"Draft\"

}

}

\-\--

\### Possible Errors

PRODUCT_NOT_FOUND

PRODUCT_IS_PUBLISHED

INVALID_CATEGORY

UNAUTHORIZED

\-\--

\### Business Events

ProductUpdated

\## Publish Product

\### Endpoint

POST /api/v1/products/{productId}/publish

\-\--

\### Purpose

Publishes a Draft Product.

\-\--

\### Permission

Super Admin

\-\--

\### Validation

The Product SHALL include:

\- At least one Category

\- At least one Image

\- At least one Product SKU

\- A Price for every SKU

\-\--

\### Business Rules

Product Status changes to Published.

Published Products become available for Storefront usage.

\-\--

\### Success Response

200 OK

\-\--

\### Possible Errors

PRODUCT_NOT_PUBLISHABLE

MISSING_IMAGES

MISSING_SKUS

MISSING_PRICE

UNAUTHORIZED

\-\--

\### Business Events

ProductPublished

\## Archive Product

\### Endpoint

POST /api/v1/products/{productId}/archive

\-\--

\### Purpose

Archives a Product.

\-\--

\### Permission

Super Admin

\-\--

\### Business Rules

Archived Products SHALL:

\- Be hidden from the Storefront.

\- Remain available for historical Orders.

\- Remain available for Reports.

\- Preserve all References.

\-\--

\### Success Response

200 OK

\-\--

\### Possible Errors

PRODUCT_NOT_FOUND

UNAUTHORIZED

\-\--

\### Business Events

ProductArchived

\## Restore Product

\### Endpoint

POST /api/v1/products/{productId}/restore

\-\--

\### Purpose

Restores an Archived Product.

\-\--

\### Permission

Super Admin

\-\--

\### Validation

The Product SHALL satisfy all current publication requirements.

\-\--

\### Business Rules

If validation succeeds:

Product Status changes to Published.

Otherwise:

Restoration is rejected.

\-\--

\### Possible Errors

PRODUCT_NOT_RESTORABLE

PRODUCT_NOT_FOUND

UNAUTHORIZED

\-\--

\### Business Events

ProductRestored

\# 12. Outfit Resource

\## Purpose

Provides CRUD operations for Outfit management.

An Outfit represents a predefined combination of Products sold as a
single commercial entity.

Inventory SHALL be calculated from Product SKU availability.

Pricing SHALL be maintained independently for each Outfit SKU.

\## Create Outfit

\### Endpoint

POST /api/v1/outfits

\-\--

\### Purpose

Creates a new Draft Outfit.

\-\--

\### Permission

Super Admin

\-\--

\### Request

{

\"name\": \"\...\",

\"categoryIds\": \[\],

\"sizes\": \[\],

\"productMappings\": \[\]

}

\-\--

\### Validation

\- Outfit Name is required.

\- At least one Category is required.

\- Product Mappings SHALL reference existing Product SKUs.

\-\--

\### Business Rules

Outfit SHALL be created as Draft.

Pricing SHALL NOT be created automatically.

Inventory SHALL NOT be stored.

Inventory SHALL always be calculated dynamically.

\-\--

\### Success Response

201 Created

\-\--

\### Possible Errors

INVALID_PRODUCT_SKU

INVALID_CATEGORY

INVALID_REQUEST

UNAUTHORIZED

\-\--

\### Business Events

OutfitCreated

\## Update Outfit

\### Endpoint

PATCH /api/v1/outfits/{outfitId}

\-\--

\### Purpose

Updates editable Outfit information.

Only Draft or Archived Outfits MAY be updated.

Published Outfits SHALL NOT allow composition changes.

\-\--

\### Permission

Super Admin

\-\--

\### Validation

\- Outfit must exist.

\- Product Mappings SHALL reference existing Product SKUs.

\-\--

\### Business Rules

Updating a Published Outfit SHALL NOT change:

\- Product Composition

\- Available Sizes

A new Outfit SHALL be created if structural changes are required.

\-\--

\### Business Events

OutfitUpdated

\## Publish Outfit

\### Endpoint

POST /api/v1/outfits/{outfitId}/publish

\-\--

\### Validation

The Outfit SHALL include:

\- At least one Category

\- At least one Image

\- At least one Outfit Size

\- Valid Product Mapping

\- A Price for every Outfit SKU

\-\--

\### Business Rules

Published Outfits become available on the Storefront.

Availability SHALL be calculated dynamically.

\-\--

\### Business Events

OutfitPublished

\## Archive Outfit

\### Endpoint

POST /api/v1/outfits/{outfitId}/archive

\-\--

\### Business Rules

Archived Outfits SHALL:

\- Be hidden from the Storefront.

\- Remain available for historical Orders.

\- Preserve all References.

\-\--

\### Business Events

OutfitArchived

\## Restore Outfit

\### Endpoint

POST /api/v1/outfits/{outfitId}/restore

\-\--

\### Validation

The Outfit SHALL satisfy all publication requirements.

\-\--

\### Business Rules

Restoration SHALL execute the same validations as Publish.

\-\--

\### Business Events

OutfitRestored

\# 13. Category Resource

\## Purpose

Provides management operations for Product and Outfit Categories.

Categories organize Products and Outfits for navigation and filtering.

\-\--

\## Supported Operations

\- Create Category

\- Get Category

\- List Categories

\- Update Category

\- Archive Category

-   Restore Category

\## Create Category

\### Endpoint

POST /api/v1/categories

\-\--

\### Purpose

Creates a new Category.

\-\--

\### Permission

Super Admin

\-\--

\### Request

{

\"name\": \"\...\",

\"scope\": \"Product \| Outfit \| Shared\",

\"parentCategoryId\": null

}

\-\--

\### Validation

\- Category Name is required.

\- Scope is required.

\- Parent Category MUST exist when provided.

\-\--

\### Business Rules

Category names MAY be duplicated under different parent Categories.

Category hierarchy SHALL remain acyclic.

\-\--

\### Success Response

201 Created

\-\--

\### Possible Errors

INVALID_PARENT_CATEGORY

INVALID_SCOPE

UNAUTHORIZED

\-\--

\### Business Events

CategoryCreated

\## Update Category

\### Endpoint

PATCH /api/v1/categories/{categoryId}

\-\--

\### Purpose

Updates Category information.

\-\--

\### Permission

Super Admin

\-\--

\### Validation

Category hierarchy SHALL remain valid.

Circular references SHALL be rejected.

\-\--

\### Business Events

CategoryUpdated

\## Archive Category

\### Endpoint

POST /api/v1/categories/{categoryId}/archive

\-\--

\### Business Rules

Archived Categories SHALL NOT appear in the Storefront.

Archived Categories SHALL remain available for historical references.

Products and Outfits already assigned to the Category SHALL preserve
their references.

\-\--

\### Business Events

CategoryArchived

\## Restore Category

\### Endpoint

POST /api/v1/categories/{categoryId}/restore

\-\--

\### Validation

Parent Category (if any) MUST still exist and be active.

\-\--

\### Business Rules

Restored Categories become selectable immediately.

\-\--

\### Business Events

CategoryRestored

\# 14. Inventory Resource

\## Purpose

Provides inventory operations for Product SKUs.

Inventory SHALL be maintained only for Product SKUs.

Outfit availability SHALL be calculated dynamically and SHALL NOT
maintain independent inventory.

\-\--

\## Supported Operations

\- Get Inventory

\- Increase Stock

\- Adjust Stock

\- Reserve Stock

-   Release Reservation

\## Get Inventory

\### Endpoint

GET /api/v1/inventory/{skuId}

\-\--

\### Purpose

Returns current inventory status for a Product SKU.

\-\--

\### Permission

Inventory Admin

Super Admin

\-\--

\### Success Response

{

\"available\": 12,

\"reserved\": 1,

\"total\": 13

}

\## Increase Stock

\### Endpoint

POST /api/v1/inventory/{skuId}/increase

\-\--

\### Purpose

Adds inventory for a Product SKU.

\-\--

\### Permission

Inventory Admin

Super Admin

\-\--

\### Request

{

\"quantity\": 20,

\"reason\": \"Warehouse Refill\"

}

\-\--

\### Validation

Quantity SHALL be greater than zero.

\-\--

\### Business Rules

Available inventory SHALL increase.

Inventory History SHALL be recorded.

\-\--

\### Business Events

InventoryIncreased

\## Adjust Stock

\### Endpoint

POST /api/v1/inventory/{skuId}/adjust

\-\--

\### Purpose

Corrects inventory after stock counting.

\-\--

\### Permission

Super Admin

\-\--

\### Request

{

\"newQuantity\": 15,

\"reason\": \"Inventory Audit\"

}

\-\--

\### Validation

New Quantity SHALL NOT be negative.

\-\--

\### Business Rules

Inventory Adjustment SHALL create an Inventory History record.

Adjustment SHALL NOT modify Order History.

\-\--

\### Business Events

InventoryAdjusted

\## Reserve Stock

\### Endpoint

POST /api/v1/inventory/{skuId}/reserve

\-\--

\### Purpose

Reserves inventory during Checkout.

\-\--

\### Business Rules

Reservation Duration:

30 Minutes

Reservation SHALL expire automatically.

Reserved inventory SHALL NOT be available for other Customers.

\-\--

\### Business Events

InventoryReserved

\## Release Reservation

\### Endpoint

POST /api/v1/inventory/{skuId}/release

\-\--

\### Purpose

Releases expired reservations.

\-\--

\### Business Rules

Released inventory SHALL become immediately available.

Shopping Cart SHALL remain unchanged.

\-\--

\### Business Events

ReservationReleased

\# 15. Pricing Resource

\## Purpose

Provides pricing operations for Product SKUs and Outfit SKUs.

Every SKU SHALL maintain an independent Price.

Price History SHALL be preserved for every Price Change.

\-\--

\## Supported Operations

\- Get Price

\- Set Price

\- Bulk Update Prices

-   Get Price History

\## Get Price

\### Endpoint

GET /api/v1/pricing/{skuId}

\-\--

\### Purpose

Returns the current Price assigned to a SKU.

\-\--

\### Permission

Inventory Admin

Super Admin

\-\--

\### Success Response

{

\"skuId\": \"\...\",

\"price\": 2850000,

\"currency\": \"IRR\"

}

\## Set Price

\### Endpoint

POST /api/v1/pricing/{skuId}/set

\-\--

\### Purpose

Assigns a new Price to a SKU.

\-\--

\### Permission

Super Admin

\-\--

\### Request

{

\"price\": 2850000,

\"reason\": \"Seasonal Pricing\"

}

\-\--

\### Validation

Price SHALL be greater than zero.

\-\--

\### Business Rules

Previous Price SHALL be preserved.

Price History SHALL be created.

New Price SHALL become effective immediately.

\-\--

\### Business Events

PriceUpdated

\## Bulk Update Prices

\### Endpoint

POST /api/v1/pricing/bulk-update

\-\--

\### Purpose

Updates Prices for multiple SKUs.

\-\--

\### Permission

Super Admin

\-\--

\### Request

{

\"filters\": {},

\"operation\": \"\...\",

\"value\": \"\...\",

\"reason\": \"Winter Campaign\"

}

\-\--

\### Business Rules

Every affected SKU SHALL receive an independent Price History record.

Bulk Operations SHALL require confirmation.

\-\--

\### Business Events

BulkPriceUpdated

\## Get Price History

\### Endpoint

GET /api/v1/pricing/{skuId}/history

\-\--

\### Purpose

Returns historical Price Changes for a SKU.

\-\--

\### Permission

Super Admin

Inventory Admin

\-\--

\### Success Response

\[

{

\"price\": 2450000,

\"changedAt\": \"\...\",

\"changedBy\": \"\...\",

\"reason\": \"Launch\"

},

{

\"price\": 2850000,

\"changedAt\": \"\...\",

\"changedBy\": \"\...\",

\"reason\": \"Seasonal Pricing\"

}

\]

\# 16. Homepage Resource

\## Purpose

Provides management operations for Homepage content.

Homepage content SHALL be managed as independent Sections.

Each Section MAY be enabled, disabled or reordered independently.

\-\--

\## Supported Operations

\- Get Homepage

\- Update Homepage

-   Reorder Sections

\## Get Homepage

\### Endpoint

GET /api/v1/homepage

\-\--

\### Purpose

Returns Homepage configuration.

\-\--

\### Permission

Super Admin

\-\--

\### Success Response

{

\"sections\":\[\]

}

\## Update Homepage

\### Endpoint

PATCH /api/v1/homepage

\-\--

\### Purpose

Updates Homepage Sections.

\-\--

\### Permission

Super Admin

\-\--

\### Validation

Every Section SHALL satisfy its own validation rules.

Disabled Sections SHALL remain stored.

\-\--

\### Business Rules

Changes SHALL become visible immediately.

Homepage SHALL preserve Section ordering.

\-\--

\### Business Events

HomepageUpdated

\## Reorder Sections

\### Endpoint

POST /api/v1/homepage/reorder

\-\--

\### Purpose

Changes Homepage Section ordering.

\-\--

\### Permission

Super Admin

\-\--

\### Request

{

\"sectionIds\":\[\]

}

\-\--

\### Business Rules

Ordering SHALL be reflected immediately.

\-\--

\### Business Events

HomepageReordered

\### Hero Validation

Hero SHALL include:

\- Title

\- Image

Optional Fields

\- Subtitle

\- CTA Label

-   Destination Link

\# 17. Journal Resource

\## Purpose

Provides management operations for Journal Articles.

Journal Articles are editorial content that MAY reference Products and
Outfits.

Referenced entities SHALL remain dynamically linked.

\-\--

\## Supported Operations

\- Create Article

\- Get Article

\- List Articles

\- Update Article

\- Publish Article

\- Archive Article

-   Delete Article

\## Create Article

\### Endpoint

POST /api/v1/journal

\-\--

\### Purpose

Creates a Draft Journal Article.

\-\--

\### Permission

Super Admin

\-\--

\### Request

{

\"title\": \"\...\",

\"coverImageId\": \"\...\",

\"content\": \"\...\",

\"references\": \[\]

}

\-\--

\### Validation

\- Title is required.

\- Cover Image is required.

\- Content is required.

\- Referenced Products and Outfits MUST exist.

\-\--

\### Business Rules

Article SHALL be created as Draft.

Referenced entities SHALL NOT be copied.

References SHALL remain dynamic.

\-\--

\### Side Effects

Article becomes available for future publication.

\-\--

\### Business Events

JournalArticleCreated

\## Publish Article

\### Endpoint

POST /api/v1/journal/{articleId}/publish

\-\--

\### Purpose

Publishes a Draft Article.

\-\--

\### Permission

Super Admin

\-\--

\### Validation

The Article SHALL include:

\- Title

\- Cover Image

\- Content

\-\--

\### Business Rules

Published Articles become visible on the Storefront.

\-\--

\### Side Effects

Search index updated.

Homepage references (if any) remain valid.

\-\--

\### Business Events

JournalArticlePublished

\## Archive Article

\### Endpoint

POST /api/v1/journal/{articleId}/archive

\-\--

\### Business Rules

Archived Articles SHALL NOT appear on the Storefront.

Article content SHALL remain preserved.

\-\--

\### Side Effects

Homepage references (if any) SHALL hide the archived Article
automatically.

\-\--

\### Business Events

JournalArticleArchived

\## Delete Article

\### Endpoint

DELETE /api/v1/journal/{articleId}

\-\--

\### Permission

Super Admin

\-\--

\### Validation

Deletion SHALL require confirmation.

\-\--

\### Business Rules

The Article SHALL be permanently removed.

\-\--

\### Side Effects

Internal references SHALL be removed automatically.

\-\--

\### Business Events

JournalArticleDeleted

\# 18. Order Resource

\## Purpose

Provides operations for managing customer Orders.

Orders SHALL be created only after successful payment.

Orders SHALL NOT be created manually.

\-\--

\## Supported Operations

\- Get Order

\- List Orders

\- Cancel Order

-   Update Fulfillment Status

\## Get Order

\### Endpoint

GET /api/v1/orders/{orderId}

\-\--

\### Purpose

Returns complete Order information.

\-\--

\### Permission

Super Admin

Inventory Admin

\-\--

\### Success Response

{

\"orderId\": \"\...\",

\"status\": \"\...\",

\"items\": \[\],

\"payment\": {},

\"customer\": {}

}

\## List Orders

\### Endpoint

GET /api/v1/orders

\-\--

\### Supports

\- Pagination

\- Search

\- Filtering

\- Sorting

\-\--

\### Filters

status

paymentStatus

customerMobile

createdFrom

createdTo

\## Update Fulfillment Status

\### Endpoint

POST /api/v1/orders/{orderId}/fulfillment

\-\--

\### Purpose

Updates fulfillment progress.

\-\--

\### Permission

Inventory Admin

Super Admin

\-\--

\### Request

{

\"status\":\"Packed\"

}

\-\--

\### Validation

Only valid status transitions SHALL be allowed.

\### Allowed Fulfillment Statuses

\- Processing

\- Packed

\- Shipped

\- Delivered

\-\--

\### Valid Status Flow

Processing

↓

Packed

↓

Shipped

↓

Delivered

Backward transitions SHALL NOT be allowed.

\-\--

\### Business Rules

Every status transition SHALL be recorded.

\-\--

\### Side Effects

Customer Notification MAY be sent.

\-\--

\### Business Events

OrderFulfillmentUpdated

\## Cancel Order

\### Endpoint

POST /api/v1/orders/{orderId}/cancel

\-\--

\### Purpose

Cancels an existing Order.

\-\--

\### Permission

Super Admin

Inventory Admin

\-\--

\### Validation

Cancellation SHALL only be allowed before Shipment.

\-\--

\### Business Rules

Inventory SHALL be restored.

Financial Reports SHALL be updated.

\-\--

\### Side Effects

Customer Notification sent.

Order Timeline updated.

\-\--

\### Business Events

OrderCancelled

\# 19. Return Resource

\## Purpose

Provides operations for processing returned Orders.

Returns SHALL adjust both Inventory and Financial Reports.

Returns SHALL always reference an existing Order.

\## Supported Operations

\- Create Return

\- Get Return

\- List Returns

\- Approve Return

-   Reject Return

\## Create Return

\### Endpoint

POST /api/v1/returns

\-\--

\### Purpose

Creates a Return Request.

\-\--

\### Permission

Inventory Admin

Super Admin

\-\--

\### Request

{

\"orderId\":\"\...\",

\"items\":\[\],

\"reason\":\"\...\"

}

\-\--

\### Validation

Referenced Order MUST exist.

Returned Quantity SHALL NOT exceed purchased Quantity.

\-\--

\### Business Rules

Return SHALL initially be created with Status = Pending.

\-\--

\### Side Effects

Return Timeline created.

\-\--

\### Business Events

ReturnCreated

\## Approve Return

\### Endpoint

POST /api/v1/returns/{returnId}/approve

\-\--

\### Purpose

Approves a Return Request.

\-\--

\### Permission

Super Admin

Inventory Admin

\-\--

\### Validation

Return MUST still be Pending.

\-\--

\### Business Rules

Returned Product Inventory SHALL increase.

Revenue Reports SHALL be adjusted.

Return Status changes to Approved.

\-\--

\### Side Effects

Customer Notification sent.

Inventory History created.

Financial Audit Log created.

\-\--

\### Business Events

ReturnApproved

\## Reject Return

\### Endpoint

POST /api/v1/returns/{returnId}/reject

\-\--

\### Validation

Return MUST still be Pending.

\-\--

\### Business Rules

Inventory SHALL remain unchanged.

Revenue SHALL remain unchanged.

Return Status changes to Rejected.

\-\--

\### Side Effects

Customer Notification sent.

\-\--

\### Business Events

ReturnRejected

\# 20. Media Resource

\## Purpose

Provides operations for uploading and managing Media Assets.

Media Assets MAY be referenced by multiple Resources.

Referenced Media SHALL NOT be deleted.

\- Upload Media

\- Get Media

\- List Media

-   Delete Media

\## Upload Media

\### Endpoint

POST /api/v1/media

\-\--

\### Purpose

Uploads a new Media Asset.

\-\--

\### Permission

Super Admin

\-\--

\### Validation

Supported file formats only.

Maximum file size SHALL be enforced.

\-\--

\### Business Rules

Media SHALL become immediately available.

\-\--

\### Side Effects

Thumbnail generation.

Image optimization.

\-\--

\### Business Events

MediaUploaded

\## Delete Media

\### Endpoint

DELETE /api/v1/media/{mediaId}

\-\--

\### Validation

Referenced Media SHALL NOT be deleted.

\-\--

\### Business Rules

Deletion SHALL be rejected if references exist.

\-\--

\### Side Effects

Unused storage SHALL be released.

\-\--

\### Business Events

MediaDeleted

\# 21. Users Resource

\## Purpose

Provides administration user management.

Authentication SHALL be handled separately.

\-\--

\## Supported Operations

\- Create User

\- Get User

\- List Users

\- Update User

-   Deactivate User

\## Create User

POST /api/v1/users

Permission

Super Admin

Request

{

\"name\":\"\...\",

\"mobile\":\"\...\",

\"role\":\"InventoryAdmin\"

}

Business Rules

OTP Authentication SHALL be enabled.

User SHALL be Active.

Business Events

UserCreated

\## Deactivate User

POST /api/v1/users/{userId}/deactivate

Business Rules

User SHALL NOT be able to authenticate.

Historical Logs SHALL remain preserved.

Business Events

UserDeactivated

\# 22. Settings Resource

\## Purpose

Provides Site Configuration management.

\-\--

Supported Operations

\- Get Settings

-   Update Settings

PATCH /api/v1/settings

Business Rules

Changes SHALL become effective immediately.

Business Events

SettingsUpdated

\# 23. Internal APIs

\## Purpose

Provides internal system operations.

These endpoints SHALL NOT be exposed through the Administration Panel or
Storefront.

Authentication SHALL require internal service credentials.

\- Checkout

\- OTP Authentication

\- Payment Callback

\- Reserve Inventory

-   Release Reservation

\## Checkout

\### Endpoint

POST /api/v1/internal/checkout

\-\--

\### Purpose

Validates Shopping Cart before Payment.

\-\--

\### Validation

Every SKU SHALL:

\- Exist

\- Have sufficient Inventory

\- Have a valid Price

\-\--

\### Business Rules

Current Prices SHALL be used.

Inventory SHALL be reserved for 30 minutes.

Reservation SHALL be created per SKU.

\-\--

\### Side Effects

Reservation Timer started.

\-\--

\### Business Events

CheckoutStarted

\## Payment Callback

\### Endpoint

POST /api/v1/internal/payment/callback

\-\--

\### Purpose

Processes Payment Gateway response.

\-\--

\### Validation

Payment SHALL be verified.

Duplicate callbacks SHALL be ignored.

\-\--

\### Business Rules

Successful Payment SHALL:

\- Create Order

\- Reduce Inventory

\- Clear Shopping Cart

Failed Payment SHALL:

\- Release Reservations

\-\--

\### Side Effects

SMS sent.

Invoice generated.

\-\--

\### Business Events

PaymentSucceeded

PaymentFailed

\## OTP Authentication

\### Send OTP

POST /api/v1/internal/auth/send-otp

\-\--

\### Verify OTP

POST /api/v1/internal/auth/verify-otp

OTP SHALL expire after configured duration.

OTP attempts SHALL be limited.

Successful Verification SHALL issue Access Token.

\## Reserve Inventory

POST /api/v1/internal/inventory/reserve

Purpose

Internal Checkout Reservation.

\## Release Reservation

POST /api/v1/internal/inventory/release

Purpose

Release expired Reservations.

\# Appendix A

\## Standard Error Codes

UNAUTHORIZED

FORBIDDEN

VALIDATION_ERROR

RESOURCE_NOT_FOUND

INVALID_REQUEST

CONFLICT

RATE_LIMITED

INTERNAL_ERROR

\# Appendix B

\## Business Error Codes

PRODUCT_NOT_PUBLISHABLE

PRODUCT_IS_PUBLISHED

PRODUCT_NOT_RESTORABLE

MISSING_IMAGES

MISSING_PRICE

MISSING_SKUS

MEDIA_IN_USE

INVALID_CATEGORY

INVALID_PRODUCT_SKU

INSUFFICIENT_INVENTORY

RESERVATION_EXPIRED

ORDER_NOT_CANCELLABLE

RETURN_ALREADY_PROCESSED

OTP_EXPIRED

OTP_INVALID

\# Appendix C

\## Naming Conventions

Resources

Plural

/products

/orders

/users

\-\--

Business Actions

Verb

/publish

/archive

/restore

/set

/approve

/reject

/cancel

\-\--

Internal APIs

/internal/\*

\# Appendix D

\## Status Codes  Product

Draft

Published

Archived

\-\--

Outfit

Draft

Published

Archived

\-\--

Order Fulfillment

Processing

Packed

Shipped

Delivered

\-\--

Payment

Pending

Paid

Failed

Refunded

\-\--

Return

Pending

Approved

Rejected
