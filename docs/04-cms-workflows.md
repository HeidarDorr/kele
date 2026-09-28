# 1. Category Management Workflow

## Purpose

This workflow defines how administrators create, update, organize and
archive Product and Outfit Categories.

Categories represent navigational structures and SHALL be available
before Products or Outfits are created.

---

## Preconditions

- User is authenticated.

- User has Super Admin permission.

- Administration Panel is accessible.

---

## Main Flow

### Step 1

Administrator opens:

Commerce

↓

Categories

---

### Step 2

The system displays:

- Existing Categories

- Status

- Sort Order

- Parent Category (if applicable)

---

### Step 3

Administrator selects:

Create Category

---

### Step 4

Administrator enters:

- Category Name

- Slug

- Parent Category (Optional)

- Sort Order

- Status

---

### Step 5

Administrator clicks:

Save

---

### Step 6

System validates:

- Required fields

- Slug uniqueness

- Parent existence

---

### Step 7

Category is created.

Business Event is generated.

---

## Alternative Flows

A1.

Administrator edits an existing Category.

↓

Changes are validated.

↓

Business Event generated.

---

A2.

Administrator changes Sort Order.

↓

Navigation updates immediately.

↓

Business Event generated.

---

A3.

Administrator archives a Category.

↓

Category becomes unavailable for future assignments.

↓

Existing Products remain associated.

↓

Category disappears from storefront navigation.

---

## Validation Rules

- Category Name is required.

- Slug must be unique.

- Sort Order must be numeric.

- Parent Category cannot reference itself.

---

## Failure Scenarios

Duplicate Slug

↓

Creation rejected.

---

Missing Name

↓

Validation error displayed.

---

Invalid Parent Category

↓

Operation rejected.

---

## Post Conditions

- Category stored successfully.

- Navigation updated.

-   Business Event recorded.

# 2. Product Management Workflow

## Purpose

This workflow defines how Products are created, edited, priced, stocked,
published and archived.

A Product SHALL exist before Inventory, Pricing or Outfit assignment can
occur.

---

## Preconditions

- User is authenticated.

- User has Super Admin permission.

- At least one Category exists.

---

## Main Flow

| Step | Actor | Action | System Response |

|------|-------|--------|-----------------|

| 1 | Admin | Open Commerce → Products | Product List displayed |

| 2 | Admin | Click \"Create Product\" | Product Form opens |

| 3 | Admin | Select Category (Multi-select) | Categories assigned
|

| 4 | Admin | Enter Product Name | Draft updated |

| 5 | Admin | Enter Product Description | Draft updated |

| 6 | Admin | Select Available Colors | Color Variants created |

| 7 | Admin | Upload Images for each Color | Images attached to
Color |

| 8 | Admin | Select Available Sizes for each Color | SKU Matrix
generated |

| 9 | Admin | Click \"Save Draft\" | Draft Product created |

### Product Workflow (Continued)

After a Product Draft is successfully created, the system SHALL redirect
the administrator to the Product Detail page.

The Product SHALL remain in Draft status until explicitly published.

---

## Product Detail Actions

The Product Detail page SHALL provide the following actions:

- Edit Product Information

- Manage Pricing

- Manage Inventory

- Publish Product

- Archive Product

- Delete Product

Delete SHALL require explicit administrator confirmation.

---

---

## Product Detail Actions

After creating a Draft Product, the administrator MAY perform the
following actions:

- Edit Product Information

- Manage Pricing

- Manage Inventory

- Publish Product

- Archive Product

- Delete Product

Pricing and Inventory management SHALL be executed through their
dedicated workflows.

Delete SHALL require explicit administrator confirmation.

---

---

## Alternative Flows

### A1. Edit Product

Administrator opens an existing Product.

↓

Administrator updates Product Information.

↓

System validates the changes.

↓

Draft is updated.

↓

Business Event is generated.

---

### A2. Publish Product

Administrator selects:

Publish

↓

System validates all required information.

↓

Validation succeeds.

↓

Product Status changes to Published.

↓

Product becomes visible on the Storefront.

↓

Business Event is generated.

---

### A3. Archive Product

Administrator selects:

Archive

↓

Product Status changes to Archived.

↓

Product is removed from the Storefront.

↓

Business Event is generated.

---

### A4. Archive Product

Administrator selects:

Archive

↓

Product Status changes to Archived.

↓

Archived Products SHALL NOT appear on the Storefront.

↓

Archived Products SHALL remain available for historical Orders, Reports
and References.

↓

Business Event is generated.

---

## Validation Rules

A Product SHALL NOT be published unless:

- At least one Category is assigned.

- Product Name exists.

- Product Description exists.

- At least one Color exists.

- Every Color has at least one Image.

- At least one SKU exists.

- Every SKU has a Price.

- Every SKU has Inventory information.

---

## Failure Scenarios

Publish without Price

↓

Publication rejected.

---

Publish without Inventory

↓

Publication rejected.

---

Publish without Images

↓

Publication rejected.

---

Duplicate Product Slug

↓

Operation rejected.

---

## Post Conditions

Published Products become available for customer purchase.

Archived Products remain available inside the Administration Panel.

Deleted Products are permanently removed according to Business Rules.

# 3. Outfit Management Workflow

## Purpose

This workflow defines how administrators create and manage Outfits.

An Outfit represents a curated combination of existing Products.

Outfits have independent pricing, publication status and inventory
availability.

---

## Preconditions

- User is authenticated.

- User has Super Admin permission.

- At least one Product exists.

- At least one Category exists.

---

## Main Flow

| Step | Actor | Action | System Response |

|------|-------|--------|-----------------|

| 1 | Admin | Open Commerce → Outfits | Outfit List displayed |

| 2 | Admin | Click \"Create Outfit\" | Outfit Form opens |

| 3 | Admin | Enter Outfit Name | Draft updated |

| 4 | Admin | Select Categories (Multi-select) | Categories assigned
|

| 5 | Admin | Upload Editorial Images | Images attached |

| 6 | Admin | Enter Outfit Description | Draft updated |

| 7 | Admin | Select Included Products | Product selector opens |

| 8 | Admin | Assign Product SKUs to each Outfit Size | Outfit SKU
Matrix generated |

| 9 | Admin | Click \"Save Draft\" | Draft Outfit created |

---

## Outfit Detail Actions

After creating a Draft Outfit, the administrator MAY perform the
following actions:

- Edit Outfit Information

- Manage Pricing

- Publish Outfit

- Archive Outfit

- Delete Outfit

Pricing SHALL be managed through the dedicated Pricing Workflow.

Inventory SHALL be calculated automatically from Product SKUs and SHALL
NOT be edited directly.

---

## Alternative Flows

### A1. Edit Outfit

Administrator opens an existing Draft Outfit.

↓

Administrator updates Outfit Information.

↓

Changes are validated.

↓

Business Event is generated.

---

### A2. Duplicate Outfit

Administrator selects:

Duplicate Outfit

↓

System creates a new Draft Outfit.

↓

The following information is copied:

- Categories

- Editorial Images

- Included Products

- Size Mapping

- Pricing

↓

Administrator updates the new Outfit as required.

↓

Business Event is generated.

---

### A3. Publish Outfit

Administrator selects:

Publish

↓

System validates all required information.

↓

Validation succeeds.

↓

Outfit Status changes to Published.

↓

Outfit becomes visible on the Storefront.

↓

Business Event is generated.

---

### A4. Archive Outfit

Administrator selects:

Archive

↓

Outfit Status changes to Archived.

↓

Outfit is removed from the Storefront.

↓

Business Event is generated.

---

### A5. Delete Outfit

Administrator selects:

Delete

↓

System requests confirmation.

↓

Outfit is permanently removed according to Business Rules.

↓

Business Event is generated.

---

## Validation Rules

An Outfit SHALL NOT be published unless:

- At least one Category is assigned.

- At least one Editorial Image exists.

- At least one Outfit Size exists.

- Every Outfit Size maps to valid Product SKUs.

- Every Outfit SKU has a Price.

---

## Failure Scenarios

Missing Product Mapping

↓

Publication rejected.

---

Missing Editorial Images

↓

Publication rejected.

---

Invalid Size Mapping

↓

Publication rejected.

---

## Post Conditions

Published Outfits become available on the Storefront.

Inventory availability SHALL be derived automatically from the
availability of all required Product SKUs.

# 4. Inventory Management Workflow

## Purpose

This workflow defines how administrators manage Product SKU inventory.

Inventory is maintained only at the Product SKU level.

Outfit inventory SHALL always be calculated automatically.

---

## Preconditions

- User is authenticated.

- User has Inventory Admin or Super Admin permission.

- Product SKU exists.

---

## Main Flow

| Step | Actor | Action | System Response |

|------|-------|--------|-----------------|

| 1 | Admin | Open Inventory Module | Inventory Dashboard displayed
|

| 2 | Admin | Search Product SKU | SKU Information displayed |

| 3 | Admin | Select Inventory Action | Inventory Form opens |

| 4 | Admin | Enter Quantity | Validation performed |

| 5 | Admin | Select Business Reason | Reason recorded |

| 6 | Admin | (Optional) Enter Reference | Reference recorded |

| 7 | Admin | Confirm | Inventory updated |

| 8 | System | Generate Business Event | Inventory History updated
|

---

## Alternative Flows

### A1. Increase Inventory

Administrator selects:

Increase Inventory

↓

Inventory increases.

↓

Business Event generated.

---

### A2. Decrease Inventory

Administrator selects:

Decrease Inventory

↓

Inventory decreases.

↓

Business Event generated.

---

### A3. Inventory Adjustment

Administrator selects:

Manual Correction

↓

Inventory adjusted.

↓

Business Event generated.

---

### Validation Rules

Inventory Quantity SHALL NOT become negative.

Inventory Actions SHALL require a Business Reason.

Only authorized users MAY modify Inventory.

---

### Failure Scenarios

Negative Inventory

↓

Operation rejected.

---

Invalid Quantity

↓

Validation error displayed.

---

Unauthorized User

↓

Operation rejected.

---

### Post Conditions

Inventory updated.

Inventory History updated.

Business Event generated.

# 5. Pricing Management Workflow

## Purpose

This workflow defines how administrators manage SKU pricing for Products
and Outfits.

Pricing is maintained independently for every SKU.

All pricing changes SHALL be historically traceable.

---

## Preconditions

- User is authenticated.

- User has Super Admin permission.

- Target SKU exists.

---

## Main Flow

| Step | Actor | Action | System Response |

|------|-------|--------|-----------------|

| 1 | Admin | Open Pricing Module | Pricing Dashboard displayed |

| 2 | Admin | Search Product or Outfit | Matching SKUs displayed |

| 3 | Admin | Select SKU | Current Price displayed |

| 4 | Admin | Enter New Price | Validation performed |

| 5 | Admin | Save | Price updated |

| 6 | System | Generate Business Event | Price History updated |

---

## Alternative Flows

### A1. Individual Price Update

Administrator updates a single SKU Price.

↓

Price updated.

↓

Business Event generated.

---

### A2. Bulk Price Update

Administrator opens:

Bulk Price Update

↓

Administrator applies filters.

↓

Administrator selects pricing operation.

↓

System previews affected SKUs.

↓

Administrator confirms.

↓

All matching SKU Prices updated.

↓

Independent Price History recorded for every SKU.

↓

Business Events generated.

---

## Validation Rules

Price SHALL be greater than zero.

Bulk Operations SHALL require administrator confirmation.

Price History SHALL preserve previous values.

---

## Failure Scenarios

Invalid Price

↓

Validation error displayed.

---

No Matching SKUs

↓

Operation cancelled.

---

Unauthorized User

↓

Operation rejected.

---

## Post Conditions

SKU Prices updated.

Price History updated.

Business Events generated.

# 6. Homepage Management Workflow

## Purpose

This workflow defines how administrators manage the visual presentation
of the Storefront homepage.

Homepage content is editorial and marketing-oriented.

Saving updates an isolated Draft. Public content changes only after an
explicit, validated Publish command.

---

## Preconditions

- User is authenticated.

- User has Super Admin permission.

---

## Main Flow

| Step | Actor | Action | System Response |

|------|-------|--------|-----------------|

| 1 | Admin | Open Editorial → Homepage | Homepage Builder displayed
|

| 2 | Admin | Select Section | Section Editor opens |

| 3 | Admin | Modify Section Content | Live Preview updated |

| 4 | Admin | Save | Draft revision updated; public revision unchanged |

| 5 | Admin | Preview | Protected Storefront-shaped Draft displayed |

| 6 | Admin | Publish | Draft validated and atomically published |

---

Supported Homepage Sections include:

- Hero Banner

- Editorial Banner

- Featured Outfits

- Featured Products

- Occasion Grid

- Brand Story

-   Journal Highlights

### Hero Configuration

Each Homepage Hero SHALL support:

- Title

- Subtitle (Optional)

- Image

- CTA Label (Optional)

- Destination Link (Optional)

- Hero Outfit (Optional)

When no Destination Link is provided, the Hero SHALL be displayed as
editorial content only.

A Hero Outfit is the destination of a Hero that presents one set. The Hero
image stays owned by the Homepage and is chosen separately from the Outfit's
own images, because it is a wide editorial frame the Outfit gallery does not
carry. A Hero Outfit and an internal Destination Link are mutually exclusive;
the CTA opens the Outfit by its current slug. Publication requires the Hero
Outfit to be published. If the Outfit later leaves the catalogue, the published
Hero is displayed as editorial content only until an editor chooses another.

---

## Alternative Flows

### A1. Reorder Homepage Sections

Administrator drags a Section to a new position.

↓

Draft order updates; the public order remains unchanged until publication.

↓

Business Event generated.

---

### A2. Disable Section

Administrator disables a Homepage Section.

↓

Section is disabled in the Draft and remains unchanged publicly until
publication.

↓

Business Event generated.

---

### A3. Configure Hero

Administrator selects a Hero Section.

↓

Administrator uploads an image.

↓

Administrator enters:

- Title

- Subtitle (Optional)

- CTA Label (Optional)

- Destination Link (Optional), or a Hero Outfit selected from published Outfits

↓

Administrator saves changes.

↓

Homepage Draft updates immediately; the public Homepage updates only after
Publish.

---

## Validation Rules

Every Hero SHALL include at least one Image.

A publication SHALL contain exactly one enabled Hero.

Editorial Sections SHALL support optional links.

Only enabled Sections SHALL appear on the Storefront.

---

## Failure Scenarios

Missing Hero Image

↓

Save rejected.

---

Invalid Destination Link

↓

Validation error displayed.

---

## Post Conditions

Homepage Draft or Published revision updated according to the explicit command.

Successful publication becomes publicly visible on the next Storefront request.

Business Event generated.

# 7. Journal Management Workflow

## Purpose

This workflow defines how administrators create, publish and manage
editorial Journal articles.

Journal content is independent from Products and Outfits, but MAY
reference them.

---

## Preconditions

- User is authenticated.

- User has Super Admin permission.

---

## Main Flow

| Step | Actor | Action | System Response |

|------|-------|--------|-----------------|

| 1 | Admin | Open Editorial → Journal | Article List displayed |

| 2 | Admin | Click \"Create Article\" | Article Editor opens |

| 3 | Admin | Enter Title | Draft updated |

| 4 | Admin | Enter Article Content | Draft updated |

| 5 | Admin | Upload Cover Image | Cover Image attached |

| 6 | Admin | (Optional) Link Products or Outfits | References
created |

| 7 | Admin | Save Draft | Draft Article created |

| 8 | Admin | Publish | Article becomes publicly visible |

---

## Editor Capabilities

The Journal Editor SHALL support:

- Headings

- Paragraphs

- Bold

- Italic

- Ordered Lists

- Unordered Lists

- Quotes

- Images

- Internal Product References

- Internal Outfit References

- External Links

- Horizontal Divider

Product and Outfit references SHALL be linked to system entities rather
than manually entered URLs.

---

## Alternative Flows

### A1. Edit Draft

Administrator updates an existing Draft Article.

↓

Changes are saved.

↓

Business Event generated.

---

### A2. Publish Article

Administrator selects:

Publish

↓

Article Status changes to Published.

↓

Article becomes visible on the Storefront.

↓

Business Event generated.

---

### A3. Archive Article

Administrator selects:

Archive

↓

Article becomes unavailable on the Storefront.

↓

Business Event generated.

---

### A4. Delete Article

Published Journal snapshots are not deleted or rewritten. The administrator
uses Archive to remove the public route while immutable publication and audit
history remain retained.

---

## Validation Rules

Every published Article SHALL include:

- Title

- Cover Image

- Content

- Excerpt

- SEO Title and Description

- Unique Slug

Journal content is stored as allowlisted structured blocks. Arbitrary HTML,
script, iframe and non-HTTPS external links are rejected or encoded as text.

Scheduled publication is not included because no approved scheduling semantics
exist for version 1.

---

## Failure Scenarios

Missing Title

↓

Publication rejected.

---

Missing Cover Image

↓

Publication rejected.

---

Missing Content

↓

Publication rejected.

---

## Post Conditions

Published Articles become publicly visible.

Referenced Products and Outfits remain dynamically linked.

Business Event generated.

# 8. Order Management Workflow

## Purpose

This workflow defines how customer Orders are created, reserved, paid,
fulfilled and completed.

Order processing SHALL ensure inventory consistency throughout the
purchase lifecycle.

---

## Preconditions

- Customer is authenticated via OTP.

- Shopping Cart contains at least one item.

- Every requested SKU is available.

---

## Main Flow

| Step | Actor | Action | System Response |

|------|-------|--------|-----------------|

| 1 | Customer | Open Checkout | Inventory Reservation starts |

| 2 | System | Validate SKU availability | Reservation created |

| 3 | Customer | Select address and eligible shipping method | CheckoutSession
quote and immutable address snapshot updated |

| 4 | Customer | Select Payment Method | Payment initialized |

| 5 | Customer | Complete Payment | Payment verified |

| 6 | System | Create paid Order from verified payment | Order Number and
shipping/address snapshots generated |

| 7 | System | Confirm Inventory Consumption | Reserved inventory
converted to sold inventory |

| 8 | System | Send Confirmation | Customer notified |

---

## Inventory Reservation

Inventory SHALL be reserved when the Customer enters the Checkout page.

Reservation Duration:

30 Minutes

During the reservation period:

- Reserved quantity SHALL NOT be available for other Customers.

- Reserved quantity SHALL remain associated with the Customer session.

If the reservation expires:

- Reserved quantity SHALL be released automatically.

- Shopping Cart contents SHALL remain unchanged.

- Availability SHALL be recalculated using current inventory.

The Customer SHALL be informed whenever a reservation has been created.

# 9. Return Management Workflow

## Purpose

This workflow defines how returned Orders are processed.

Returns SHALL restore inventory and adjust financial reports.

Returns MAY originate from:

- Website Orders

- Instagram Orders

---

## Preconditions

- For a Website Order, the authenticated Customer owns the delivered Order.
- Delivery has been confirmed.
- A Website return request is submitted no later than 24 hours after confirmed
  delivery.
- The Customer declares that the Product is unused and unwashed.
- The Customer declares that original tags and labels remain attached.
- The returned SKU and eligible remaining quantity exist.
- Final review requires Inventory Admin or Super Admin permission.

---

## Main Flow

| Step | Actor | Action | System Response |

|------|-------|--------|-----------------|

| 1 | Customer | Open delivered Order | Eligible items and deadline displayed |

| 2 | Customer | Select items, quantities and reason | Eligibility validated |

| 3 | Customer | Confirm required condition declarations | Return request submitted |

| 4 | Admin | Open Returns Module and review request | Evidence and history displayed |

| 5 | Admin | Approve or reject with reason | Decision recorded |

| 6 | System | If approved, restore inventory | Inventory movement recorded |

| 7 | System | If approved, adjust financial records | Refund/revenue workflow updated |

| 8 | System | Generate Business Events | Submission and decision history recorded |

---

## Return Sources

### Website Order

Required Information:

- Order Number

- Returned SKU

- Quantity

- Reason

- Unused declaration

- Unwashed declaration

- Original tags and labels declaration

- Recorded delivery-confirmation timestamp

---

### Instagram Order

Required Information:

- Product SKU

- Quantity

Order Number is not required.

Instagram returns remain an authorized administrative workflow. The 24-hour
customer self-service window applies to Website Orders; any distinct Instagram
policy requires an explicit business rule.

# 10. Media Library Workflow

## Purpose

This workflow defines how administrators upload, organize and reuse
media assets across the CMS.

Media assets MAY be used by:

- Products

- Outfits

- Homepage

- Journal

The Media Library SHALL act as a centralized asset repository.

---

## Preconditions

- User is authenticated.

- User has Super Admin permission.

---

## Main Flow

| Step | Actor | Action | System Response |

|------|-------|--------|-----------------|

| 1 | Admin | Open Media Library | Asset Grid displayed |

| 2 | Admin | Upload Images | Upload starts |

| 3 | System | Validate File | Accepted or rejected |

| 4 | System | Generate Thumbnail | Preview created |

| 5 | Admin | Save | Asset stored |

---

Standalone Media Library uploads do not require or attach color metadata. A
Product image receives its merchandising color only inside the Product →
ColorVariant authoring flow, so uploading a reusable asset cannot silently
change Product color behavior.

---

## Alternative Flows

### A1. Replace Asset

Administrator uploads a newer version.

↓

Asset updated.

↓

Existing references remain unchanged.

---

### A2. Delete Asset

Administrator selects Delete.

↓

System checks Draft, active and historical references.

↓

If asset is currently used:

Deletion rejected.

↓

Otherwise:

Asset deleted.

---

### A3. Search Assets

Administrator searches by:

- Filename

- Product

- Outfit

- Tags

↓

Matching assets displayed.

---

## Validation Rules

Supported Formats:

- JPG

- PNG

- WEBP

Unsupported formats SHALL be rejected.

Assets currently or historically referenced by the system SHALL NOT be deleted.

---

## Failure Scenarios

Unsupported File Type

↓

Upload rejected.

---

Referenced Asset Deletion

↓

Operation rejected.

---

## Post Conditions

Media Library updated.

Assets become available throughout the CMS.

Business Event generated.

# 11. Site Settings Workflow

## Purpose

This workflow defines how global system configuration is managed.

Settings affect the behavior of the Storefront and Administration Panel.

Saving updates an isolated Draft. Validated publication creates a new effective
version and becomes visible on the next Storefront request.

---

## Preconditions

- User is authenticated.

- User has Super Admin permission.

---

## Main Flow

| Step | Actor | Action | System Response |

|------|-------|--------|-----------------|

| 1 | Admin | Open Settings | Settings Dashboard displayed |

| 2 | Admin | Select Settings Category | Configuration page opens |

| 3 | Admin | Modify Values | Validation performed |

| 4 | Admin | Save | Draft settings updated; public settings unchanged |

| 5 | Admin | Publish | Validated version becomes effective |

| 6 | System | Generate Business Event | Settings History recorded
|

---

## Supported Settings

The system SHALL support configuring:

- Brand Information

- Contact Information

- Social Media Links

- Low Stock Threshold

- Homepage Default Configuration

- OTP Configuration

- Shipping Method Enablement

- Fixed Price for Iran Post, Tipax and Tehran Local Courier

- Free Shipping Threshold

-   SEO Defaults

Shipping policy price and threshold settings remain owned by the versioned
Checkout shipping policy workflow. The editorial settings editor MUST NOT
publish replacement shipping, pricing, legal or returns claims without explicit
content approval.

---

## Alternative Flows

### A1. Update Contact Information

Administrator updates contact details.

↓

Changes are reflected on the Storefront after publication.

---

### A2. Update Social Media Links

Administrator updates social links.

↓

Footer is updated after publication.

---

### A3. Update Low Stock Threshold

Administrator changes threshold value.

↓

Inventory warning logic updated immediately.

---

### A4. Update Shipping Settings

Administrator enables or disables supported methods, changes fixed prices, or
changes the free-shipping threshold.

↓

A new effective configuration version is created and audited.

↓

New Checkout quotes use the updated configuration without software deployment.

Existing CheckoutSessions and Orders preserve their snapshots.

---

## Validation Rules

Required settings SHALL NOT be empty.

Threshold values SHALL be positive integers.

---

## Failure Scenarios

Invalid Threshold

↓

Validation error displayed.

---

Missing Required Information

↓

Save rejected.

---

## Post Conditions

System configuration updated.

Business Event generated.

# 12. User Management Workflow

## Purpose

This workflow defines how Administration Panel users are managed.

User access SHALL be controlled through predefined Roles.

---

## Preconditions

- User is authenticated.

- User has Super Admin permission.

---

## Main Flow

| Step | Actor | Action | System Response |

|------|-------|--------|-----------------|

| 1 | Admin | Open User Management | User List displayed |

| 2 | Admin | Create User | User Form opens |

| 3 | Admin | Enter User Information | Validation performed |

| 4 | Admin | Assign Role | Permissions applied |

| 5 | Admin | Save | User created |

---

## Supported Roles

The system SHALL support:

- Super Admin

- Inventory Admin

- Instagram Admin

Permissions SHALL be assigned automatically according to the selected
Role.

---

## Alternative Flows

### A1. Edit User

Administrator updates user information.

↓

Changes saved.

---

### A2. Change Role

Administrator assigns a different Role.

↓

Permissions updated immediately.

---

### A3. Deactivate User

Administrator deactivates a User.

↓

User access revoked immediately.

---

## Validation Rules

Every User SHALL have:

- Full Name

- Mobile Number

- Assigned Role

Mobile Numbers SHALL be unique.

---

## Failure Scenarios

Duplicate Mobile Number

↓

Operation rejected.

---

Missing Required Fields

↓

Validation error displayed.

---

## Post Conditions

User information updated.

Permissions synchronized.

Business Event generated.
