# Employer decisions: Open Questions Resolution v1

Version: 1.0
Status: Approved and incorporated
Decision date: 2026-07-24
Source: employer-returned `open-questions-v1.md` external input

This file preserves the employer-approved decision record in normalized
Markdown. The decisions have been incorporated into the canonical
specifications and assigned stable rule IDs. If wording here conflicts with a
later accepted ADR or Frozen specification update, normal source-of-truth
ordering applies.

## Approved decisions

1. Version 1 supports only Persian (`fa-IR`) with RTL layout. Architecture
   remains locale-ready.
2. Development and testing use a Fake Payment Adapter. A production provider
   is selected before deployment and remains behind a provider-neutral backend
   abstraction.
3. Development and testing use a Fake SMS Provider. OTP and notifications use
   one centralized replaceable SMS adapter.
4. Version 1 shipping methods are Iran Post, Tipax, and Local Courier for
   Tehran only. Customers pay shipping. Each method has a CMS-configurable
   fixed price. A configurable free-shipping threshold applies without a
   software deployment.
5. Customers may submit a return request within 24 hours after confirmed
   delivery when the product is unused, unwashed, and retains original tags
   and labels. An administrator gives final approval.
6. Every Outfit Revision explicitly maps each Outfit size to the component
   SKUs required for that size. Outfit stock is derived and never stored.
7. Published Outfit compositions and historical revisions are immutable.
   Composition changes produce a new revision.
8. Anonymous visitors may manage a cart. Checkout requires authentication.
   Guest and user carts merge through deterministic rules after successful
   authentication.
9. Wishlist is outside version 1.
10. Newsletter is outside version 1.
11. IRR is the canonical internal monetary unit. The UI may display toman.
12. Each Order stores an immutable shipping-address snapshot.
13. PostgreSQL search is sufficient; a dedicated search engine is deferred.
14. Reservations occur at SKU level. Outfit reservation reserves every
    participating SKU simultaneously and fails entirely if any component
    cannot be reserved.

## Identifier normalization

The returned source labelled currency and shipping-address decisions OQ-011
and OQ-012. Those identifiers were already used in the repository's design
input register. They are recorded as RQ-017 and RQ-018 in
`docs/open-questions.md`; their approved meaning is unchanged.

## Residual clarifications

The approved decisions do not define:

- the exact amount used to test free-shipping eligibility;
- the exact deterministic Guest Cart merge algorithm;
- production payment/SMS providers;
- final brand assets and missing screen designs.

Those items remain explicitly tracked and block only their affected work.
