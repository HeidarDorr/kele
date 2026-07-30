# Approved checkout clarifications

Version: 1.0
Status: Approved and incorporated
Decision date: 2026-07-28
Source: product-owner response in the project thread

## Free-shipping eligibility

The free-shipping threshold is evaluated against the Order Subtotal.

Order Subtotal contains Products and Outfits only. Shipping charges, discounts,
and taxes are excluded from free-shipping eligibility.

## Guest Cart merge

After authentication:

1. Items absent from the User Cart are added.
2. Matching SKU quantities are combined.
3. Combined quantities exceeding available inventory are reduced to the
   maximum reservable amount and the User is notified.
4. Unavailable SKUs remain in the Cart with `unavailable` status and block
   Checkout until resolved.
5. Outfit Revisions are never automatically replaced. An Outfit Revision no
   longer purchasable enters `requires_review` and blocks Checkout.

## Identifier normalization

The response labelled these OQ-014 and OQ-015. In the repository they resolve
the previously tracked OQ-013 (free-shipping basis) and OQ-014 (Guest Cart
merge). They are recorded as RQ-021 and RQ-022 in the decision register without
changing their meaning.
