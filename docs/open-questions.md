# Open questions and decision register

Version: 1.0  
Status: Active  
Owner: Product owner  
Last reviewed: 2026-07-24

Blocking questions prevent implementation of the affected feature, not the
entire project.

## Blocking product decisions

| ID | Question | Why it matters | Required before | Proposed default |
|---|---|---|---|---|
| OQ-001 | Is version 1 Persian RTL, English LTR, or Persian-first with dormant English support? | Routing, fonts, layout, SEO, copy and testing differ. | Storefront UI implementation | Persian RTL; architecture remains locale-ready. |
| OQ-002 | Which Iranian payment gateway and settlement behavior are required? | Callback verification, refunds, reconciliation and credentials are provider-specific. | Real payment integration | Use a fake adapter in development; decide provider before production. |
| OQ-003 | Which SMS provider sends OTP, and what sender/retention rules apply? | Authentication cannot be production-ready without provider and abuse limits. | Production authentication | Provider-neutral adapter with fake development transport. |
| OQ-004 | What are the official shipping zones, methods, prices, free-shipping threshold and delivery estimates? | Screenshot claims are not approved rules. | Checkout pricing | Store all values in versioned settings; publish no threshold yet. |
| OQ-005 | What is the official return window and eligibility policy? | The screenshot says 14 days but business rules do not. | Customer-facing copy and return workflow | Do not show “14 days” until approved. |
| OQ-006 | How do garment sizes map across products in an Outfit? | Exact component SKUs are required for availability and reservation. | Outfit checkout | Use an explicit `OutfitSizeComponent` mapping per composition revision. |
| OQ-007 | Can an admin change an Outfit's default colors after customers have purchased it? | Historical presentation and fulfillment must remain reproducible. | Outfit editing | Create a new immutable composition revision. |
| OQ-008 | Are guest carts required, and how are they merged after OTP login? | Affects cookies, identity, privacy and cart API. | Cart implementation | Anonymous signed cart ID; deterministic merge on login. |
| OQ-009 | Is wishlist in version 1? | It appears in references but not project scope. | Navigation and product card completion | Exclude until explicitly approved. |
| OQ-010 | Is newsletter collection in version 1 and which consent text/provider applies? | Personal data and marketing consent are involved. | Homepage completion | Render only after consent and provider are defined. |

## Blocking design inputs

| ID | Missing input | Impact | Proposed action |
|---|---|---|---|
| OQ-011 | Final logo files in SVG | Header/footer sharpness and spacing | Request primary, monochrome and favicon variants. |
| OQ-012 | Licensed Latin and Persian fonts | Brand fidelity and performance | Provide font files and licenses; use documented fallbacks meanwhile. |
| OQ-013 | Product photography and usage rights | Storefront cannot ship with generated product imagery | Prepare an asset inventory with ownership and focal points. |
| OQ-014 | Designs for PLP, search, cart, checkout, account, journal and CMS | Reference images cover only homepage and desktop PDP | Approve low-fidelity flows before high-fidelity implementation. |
| OQ-015 | Exact desktop/mobile breakpoint behavior | Visual acceptance would otherwise be subjective | Use provisional breakpoints in `design-system.md`, then approve. |

## Non-blocking decisions

| ID | Question | Default |
|---|---|---|
| OQ-016 | Analytics provider | Define neutral events; select provider before production. |
| OQ-017 | Error monitoring provider | Use an adapter and structured logging; decide during infrastructure phase. |
| OQ-018 | Production S3-compatible provider/CDN | MinIO locally; provider selected before staging. |
| OQ-019 | Exact search ranking and Persian normalization | Start with approved fields and collect real queries before tuning. |
| OQ-020 | Review verified-purchase time window | Any delivered order containing the catalog object. |

## Resolved during hardening

| ID | Resolution | Record |
|---|---|---|
| RQ-001 | NestJS replaces ASP.NET while preserving the documented architecture. | ADR-0001 |
| RQ-002 | Prisma replaces EF Core and is contained in infrastructure. | ADR-0001 |
| RQ-003 | Canonical product hierarchy is Product → ColorVariant → SKU. | ADR-0002 |
| RQ-004 | Outfit stock is derived from exact component SKUs and never stored. | ADR-0003 |
| RQ-005 | Order is created only after verified payment; checkout/payment attempts precede it. | ADR-0004 |
| RQ-006 | Short-lived branches and atomic Conventional Commits are required. | `AGENTS.md` |

## Resolution protocol

For each answer:

1. Record the owner and decision date.
2. Add or update an ADR if alternatives or long-term consequences exist.
3. Update the affected normative specification.
4. Update OpenAPI, data model, test plan, and traceability as applicable.
5. Remove provisional UI copy that conflicts with the accepted answer.

