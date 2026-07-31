# Open questions and decision register

Version: 1.2
Status: Active
Owner: Product owner
Last reviewed: 2026-07-24

The employer-approved answers in
`decisions/2026-07-24-employer-open-questions-v1.md` resolve the original
OQ-001 through OQ-010. Two additional decisions in that response reused the
identifiers OQ-011 and OQ-012, which were already assigned to design inputs in
this register. They are normalized here as RQ-017 and RQ-018; no decision
meaning was changed.

Blocking questions prevent implementation of the affected feature, not the
entire project.

## Product implementation readiness

No unresolved product-behavior question currently blocks Milestones 1–5.
Production-provider decisions and final design assets remain gated below.

## Blocking production-provider decisions

Development may proceed with adapters. These items block staging/production
integration, not domain or UI development.

| ID | Missing decision | Required before |
|---|---|---|
| OQ-002-PROD | Iranian payment provider, refund API, verification and settlement behavior | Production payment integration |
| OQ-003-PROD | SMS provider, sender identity, delivery reports, retention and commercial limits | Production OTP/notification integration |

## Blocking design inputs

Design identifiers use the `DES` prefix to avoid collision with the
employer-returned decision numbering.

| ID | Missing input | Impact | Proposed action |
|---|---|---|---|
| DES-001 | Final logo files in SVG | Header/footer sharpness and spacing | Request primary, monochrome and favicon variants; the current typed wordmark and `K` favicon are explicitly provisional. |
| DES-002 | Final approved and licensed Latin/Persian fonts | Brand fidelity, RTL shaping and performance | Elize and Peyda plus the SIL-OFL Markazi Text alternative are integrated for review only; compare the two display variants, confirm Elize licensing and approve or replace the pairing before production. |
| DES-003 | Product photography and usage rights | Storefront cannot ship with generated product imagery | Prepare an asset inventory with ownership and focal points. |
| DES-004 | Designs for PLP, search, cart, checkout, account, Journal and CMS | References cover only homepage and desktop PDP | Approve low-fidelity flows before high-fidelity implementation. |
| DES-005 | Exact desktop/mobile breakpoint behavior | Visual acceptance would otherwise remain subjective | Use provisional breakpoints in `design-system.md`, then approve. |

## Non-blocking decisions

| ID | Question | Default |
|---|---|---|
| OQ-016 | Analytics provider | Define neutral events; select provider before production. |
| OQ-017 | Error monitoring provider | Use an adapter and structured logging; decide during infrastructure phase. |
| OQ-018 | Production S3-compatible provider/CDN | MinIO locally; provider selected before staging. |
| OQ-019 | Exact search ranking and Persian normalization | PostgreSQL search with documented normalization; tune after collecting real queries. |
| OQ-020 | Review verified-purchase time window | Any delivered order containing the catalog object. |
| OQ-021 | The draft CMS workflow mentions an optional Parent Category, while the frozen domain model defines only flat Category metadata and relationships. | Keep version-1 catalog Categories flat; approve hierarchy and its cycle/deletion semantics before adding parent persistence or nested navigation. |

## Resolved during hardening

| ID | Resolution | Record |
|---|---|---|
| RQ-001 | NestJS replaces ASP.NET while preserving the documented architecture. | ADR-0001 |
| RQ-002 | Prisma replaces EF Core and is contained in infrastructure. | ADR-0001 |
| RQ-003 | Canonical product hierarchy is Product → ColorVariant → SKU. | ADR-0002 |
| RQ-004 | Outfit stock is derived from exact component SKUs and never stored. | ADR-0003 |
| RQ-005 | Order is created only after verified payment; checkout/payment attempts precede it. | ADR-0004 |
| RQ-006 | Short-lived branches and atomic Conventional Commits are required. | `AGENTS.md` |
| RQ-007 | Version 1 is Persian (`fa-IR`) and RTL; architecture remains locale-ready. | LOC-001–LOC-002 |
| RQ-008 | Development/testing use a Fake Payment Adapter; production provider remains replaceable. | PAY-001–PAY-003 |
| RQ-009 | Development/testing use a Fake SMS Provider behind a centralized adapter. | SMS-001–SMS-002 |
| RQ-010 | Iran Post, Tipax and Tehran Local Courier are supported with CMS-configured fixed prices and a configurable free-shipping threshold. | SHP-001–SHP-007 |
| RQ-011 | Return requests are accepted within 24 hours after confirmed delivery subject to item-condition rules and administrator approval. | RTE-001–RTE-005 |
| RQ-012 | Every Outfit Revision explicitly maps Outfit sizes to exact component SKUs. | OTF-014–OTF-016 |
| RQ-013 | Published Outfit revisions are immutable and historical revisions never change. | OTF-017–OTF-018 |
| RQ-014 | Anonymous carts are supported; authentication is required for checkout; carts merge deterministically after authentication. | CRT-011–CRT-013 |
| RQ-015 | Wishlist is outside version 1. | SCP-001 |
| RQ-016 | Newsletter is outside version 1. | SCP-002 |
| RQ-017 | Internal currency is IRR; UI may display toman. | PRC-011–PRC-012 |
| RQ-018 | Orders store immutable shipping-address snapshots. | ORD-018 |
| RQ-019 | PostgreSQL search is sufficient for version 1; a dedicated search engine is deferred. | CAT-006 |
| RQ-020 | Outfit reservations reserve all component SKUs atomically and fail as a whole. | INV-018 |
| RQ-021 | Free-shipping eligibility uses Order Subtotal containing Products and Outfits only; shipping, discounts and taxes are excluded. | SHP-006, SHP-008 |
| RQ-022 | Guest Cart merge adds missing lines, combines matching SKUs with inventory caps and notices, preserves unavailable lines, and never replaces Outfit Revisions automatically. | CRT-013–CRT-018 |

## Resolution protocol

For each answer:

1. Record the owner and decision date.
2. Add or update an ADR if alternatives or long-term consequences exist.
3. Update the affected normative specification.
4. Update OpenAPI, data model, test plan, and traceability as applicable.
5. Remove provisional UI copy that conflicts with the accepted answer.
