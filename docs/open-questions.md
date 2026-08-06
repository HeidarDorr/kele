# Open questions and decision register

Version: 1.2
Status: Active
Owner: Product owner
Last reviewed: 2026-08-05

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

## Recorded source conflicts

These conflicts are resolved by the documented source-of-truth order and do
not require a new product decision. They remain recorded so implementation does
not silently choose older wording.

| ID | Conflicting sources | Applied resolution |
|---|---|---|
| SRC-M5-001 | Frozen `02-domain-model.md` describes one Outfit selling price, while accepted ADR-0003 and OTF-004 define a price for every Outfit size. | ADR-0003 is authoritative. Price belongs to the immutable Outfit Revision size; Product component prices do not derive or mutate it. |
| SRC-M5-002 | OTF-006 says manual Outfit-size definition is forbidden, while accepted ADR-0003 and later OTF-014 require an explicit mapping from every Outfit size to exact component SKUs. | ADR-0003 is authoritative. Administrators explicitly author and validate each revision-size mapping; no size or SKU is inferred by string equality. |
| SRC-M7-001 | Draft CMS-006 and the draft Homepage workflow said Homepage saves publish immediately and draft mode was out of scope, while the approved Milestone 7 implementation brief explicitly requires Homepage draft/published isolation, protected preview and publication. | Resolved for Milestone 7: the explicit brief governs, and CMS-006 plus the supporting workflow now specify isolated save, protected preview and explicit publication. No Frozen document or accepted ADR changed. |
| SRC-M8-001 | The seeded published Site Settings footer contains `/about` and `/contact`, while no version-1 route, workflow or approved content contract defines either destination. | Milestone 8 filters those two unapproved destinations from rendered navigation and retains only existing version-1 routes. Adding the pages or repointing customer-facing links requires an approved requirement/content decision. |

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
| DES-001 | Final logo files in SVG | Header/footer sharpness and spacing | M8 measures the typed KELE wordmark and `K` favicon as provisional fallbacks. Supply and approve primary, monochrome and favicon SVG variants before launch. |
| DES-002 | Final approved and licensed Latin/Persian fonts | Brand fidelity, RTL shaping and performance | M8 verifies the local Elize/Peyda pairing and Markazi review alternative without asserting licensing. Confirm Elize licensing and approve or replace the pairing before launch. |
| DES-003 | Final Product/editorial photography, focal points and usage rights | Prototype and missing-media fallbacks cannot become launch assets | M8 uses only supplied repository assets and an explicit reserved fallback; no substitute photography was generated. Approve the asset inventory, rights and crops before launch. |
| DES-004 | Approved designs for PLP, search, cart, checkout, account, Journal and CMS | References cover only Homepage and desktop PDP | M8 implements and captures one coherent extrapolation across all version-1 customer routes. Product/design approval of the 76 route baselines remains required before launch. |
| DES-005 | Exact desktop/mobile breakpoint behavior | Visual acceptance would otherwise remain subjective | M8 fixes provisional behavior at 390, 768, 1280 and 1440 px with content-driven 640/1024 boundaries and zero-overflow checks. Product/design breakpoint sign-off remains required before launch. |

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
