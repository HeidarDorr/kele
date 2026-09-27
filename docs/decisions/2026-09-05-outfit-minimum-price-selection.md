# Outfit minimum-price presentation

Status: Approved and incorporated
Date: 2026-09-05
Source: Product Owner instruction

## Decision

- Every Storefront card for an Outfit presents the lowest configured price
  among the sizes of the published Outfit Revision.
- Opening an Outfit detail page initially selects the first configured size
  whose integer rial price equals that lowest price.
- Current availability does not change this initial presentation. Existing
  unavailable-size semantics and purchase blocking continue to apply.
- If multiple sizes share the lowest price, their configured display order is
  the deterministic tie-breaker.

## Rationale and impact

An Outfit Size already owns its independent selling price under ADR-0003,
PRC-003 and OTF-004. This decision only makes the Storefront projection and
initial selection deterministic; it does not derive Outfit prices from Product
prices or alter Cart, Checkout, inventory or historical revision behavior.

The requirement is incorporated as OTF-021 and as the `startingPrice` semantic
in the public OpenAPI contract.
