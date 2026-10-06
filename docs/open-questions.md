# Open questions and decision register

Version: 1.5
Status: Active
Owner: Product owner
Last reviewed: 2026-10-06

The employer-approved answers in
`decisions/2026-07-24-employer-open-questions-v1.md` resolve the original
OQ-001 through OQ-010. Two additional decisions in that response reused the
identifiers OQ-011 and OQ-012, which were already assigned to design inputs in
this register. They are normalized here as RQ-017 and RQ-018; no decision
meaning was changed.

Blocking questions prevent implementation of the affected feature, not the
entire project.

## Product implementation readiness

There are no unresolved product-behavior questions. Production-provider
decisions are resolved by ADR-0005. External provider, regional infrastructure
and recovery certifications plus final design assets remain gated below.

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
| SRC-CMS-001 | `docs/openapi.yaml` declares an optional `status` query for `GET /admin/products`, while the shared runtime `CatalogQueryDto` rejects that property and the repository contract has no administration-status filter. | OpenAPI remains authoritative and the API mismatch is recorded for a dedicated contract fix. The Homepage editor does not send the rejected parameter; it filters the complete current administration result to published Products before rendering the selector, preserving publication validation without changing public catalog behavior. |
| SRC-PDP-001 | The earlier Product-detail guidance and implementation replaced the gallery with only the selected ColorVariant's Media, while the Product Owner requested one gallery containing Media from every Product color. | Resolved by the explicit Product Owner instruction on 2026-08-28: CAT-009 and the amended UI guidance keep every published color's Media in one gallery. Color selection sets the purchasable variant and initial gallery position; it no longer filters the gallery. |

## Resolved production-provider decisions

The Product Owner approved these choices in the Milestone 9 project thread on
2026-08-07. ADR-0005 is authoritative; approval does not imply that an account,
credential, paid plan or passing sandbox certification exists.

| ID | Approved decision | Record |
|---|---|---|
| OQ-002-PROD | Vandar IPG v3 and Refund v3 with server inquiry/verification, exact IRR comparison and operator-managed refund retry/token rotation | ADR-0005; `decisions/2026-08-07-m9-production-providers.md` |
| OQ-003-PROD | Kavenegar REST v1 Verify Lookup with the approved `KeleOtp` template and 48-hour bounded delivery-status lookup | ADR-0005; `decisions/2026-08-07-m9-production-providers.md` |
| OQ-017 | KELE-managed Grafana OSS 13, Loki 3.7 and Prometheus 3 in the approved Iran region | ADR-0005; `decisions/2026-08-07-m9-production-providers.md` |
| OQ-018 | ArvanCloud Simin `ir-thr-at1` multi-zone private Object Storage and CDN | ADR-0005; `decisions/2026-08-07-m9-production-providers.md` |
| OQ-022 | First-party PostgreSQL administrator principals, Kavenegar OTP and opaque revocable sessions | ADR-0005; `decisions/2026-08-07-m9-production-providers.md` |

### Milestone 9 scope verification

Decision verification date: 2026-08-08 (`Asia/Tehran`).

All five decision questions are closed by ADR-0005. The approved adapters and
first-party administration-session path may therefore be implemented. Real
Vandar/Kavenegar sandbox execution, private observability-cluster acceptance,
Arvan bucket/CDN certification and managed PostgreSQL recovery remain explicit
release blockers because this repository has no associated tenant credentials,
remote CI identity or managed service. The exact non-secret evidence fields are
tracked in `docs/m9-production-approval-record.md`; local mock/contract evidence
must never be labelled provider certification.

`CERT-M9-001` is an additional certification blocker, not a reopened provider
selection: the published Vandar Refund v3 contract documents an asynchronous
`notify_url` form payload but does not document a callback signature, shared
secret, authenticated status-inquiry endpoint or another replay-authentication
mechanism. KELE's external-callback rule requires authentication and replay
safety. The refund request adapter therefore remains fail-closed at `pending`;
no Refund webhook endpoint is exposed and no completed Refund is inferred until
Vandar supplies a certifiable authentication/inquiry contract or an explicitly
approved ADR addendum defines a safe alternative.

## M8-exit design waivers and launch blockers

Design identifiers use the `DES` prefix to avoid collision with the
employer-returned decision numbering.

Decision record:

- Decision type: explicit waiver for Milestone 8 engineering exit only;
- source: explicit user instruction in the M8 gate-remediation task;
- decision date: 2026-08-06 (`Asia/Tehran`);
- approval boundary: none of these waivers approves an asset, font licence,
  usage right, design extrapolation or breakpoint for production;
- expiry: each waiver expires at its stated release gate. An unresolved item at
  that gate is a production-launch `NO-GO` and cannot roll forward silently.

| ID      | Temporary M8 waiver                                                                                                                                       | Resolution owner                                                                 | Resolution due                                                                 | Launch effect                                                                                               |
| ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------- |
| DES-001 | The customer-supplied signature PNG temporarily replaces the typed wordmark in Storefront and Administration for local review only. It is explicitly not the final logo. | Product Owner (accountable); Brand/Design owner (delivery) | Before production release-candidate visual sign-off | This question remains open and launch remains `NO-GO` until the final primary, monochrome and favicon assets are supplied and approved. |
| DES-002 | Resolved 2026-10-06: Parastoo headings with Vazirmatn body/control text is the final approved pairing (`parastoo-vazirmatn`). Official upstream provenance, manifest entries and OFL files are bundled in `packages/design-system/assets/fonts/open-source/`. `estedad-vazirmatn`, Elize/Peyda and Markazi remain explicit legacy rollback settings only. | Product Owner (accountable); Legal/Procurement and Design owners (delivery) | Resolved 2026-10-06 | Typography launch blocker cleared. See `decisions/2026-10-06-final-typography-pairing.md`. Other DES-* blockers remain. |
| DES-003 | Repository prototype imagery and the reserved missing-media treatment may be used only for M8 evidence. No usage right or production approval is implied. | Product Owner (accountable); Creative/Content owner (delivery)                   | Before production content freeze and customer-facing UAT                       | M8 may close; launch remains `NO-GO` until final photography, rights, focal points and crops are approved.       |
| DES-004 | The 76 route baselines are engineering extrapolation candidates only; they are not final product/design approval.                                      | Product Owner and Design owner (jointly accountable)                             | Before production UAT and final design sign-off                                | M8 may close; launch remains `NO-GO` until the extrapolated route families receive product/design approval.     |
| DES-005 | The content-driven 640/1024 boundaries and 390/768/1280/1440 evidence widths are provisional M8 acceptance values only.                                | Product Owner and Design owner (accountable); Frontend lead (validation)         | Before production responsive UAT and breakpoint sign-off                       | M8 may close; launch remains `NO-GO` until responsive behavior and breakpoint boundaries are approved.          |
| DES-006 | The redesigned Homepage introduces brand-owned Persian copy that no requirement states: the four brand promises, the three craft captions, and the closing band. It asserts natural fibres, soft lining, freedom of movement and durability after washing. | Product Owner (accountable); Creative/Content and Legal owners (delivery) | Before production content freeze and customer-facing UAT | Launch is `NO-GO` until each claim is approved as accurate for the actual garments, or the copy is replaced. The copy makes no shipping, pricing, return or availability claim. |
| DES-007 | The Homepage hero and closing frames are prototype artwork. The nine demo-set images (a lead look and a detail frame for each of the four development-seed sets, plus a scene frame for `camel-vest-set`, under `/media/outfits/`) do not exist yet; the Hero set's two are generated from the hero frame as reference. Every briefed image is specified in `apps/storefront/lib/art-direction.ts` and renders its own production brief in place until the file is delivered; real sets carry their own uploaded media and need no brief. | Product Owner (accountable); Creative/Content owner (delivery) | Before production content freeze | Launch is `NO-GO` until the artwork is delivered with recorded usage rights, or the affected sections are removed. Briefs never render in production; missing artwork degrades to the reserved unavailable state. |

## Non-blocking decisions

| ID | Question | Default |
|---|---|---|
| OQ-016 | Analytics provider | Define neutral events; select provider before production. |
| OQ-019 | Exact search ranking and Persian normalization | PostgreSQL search with documented normalization; tune after collecting real queries. |
| OQ-020 | Review verified-purchase time window | Any delivered order containing the catalog object. |
| OQ-021 | The draft CMS workflow mentions an optional Parent Category, while the frozen domain model defines only flat Category metadata and relationships. | Keep version-1 catalog Categories flat; approve hierarchy and its cycle/deletion semantics before adding parent persistence or nested navigation. |
| OQ-023 | ADR-0005 requires malware scanning before raster Media becomes publishable, but no scanner/provider or operational certification procedure is approved. | Keep production Media upload fail-closed. Local/UAT may exercise signature, size, dimension and Object Storage flows; production activation requires an accepted scanner decision and certification evidence. |

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
| RQ-023 | Production payment and refund use Vandar IPG v3/Refund v3 behind the provider-neutral ports. | ADR-0005, OQ-002-PROD |
| RQ-024 | Production OTP uses Kavenegar Verify Lookup and bounded delivery-status lookup. | ADR-0005, OQ-003-PROD |
| RQ-025 | Production observability is KELE-managed Grafana/Loki/Prometheus inside Iran. | ADR-0005, OQ-017 |
| RQ-026 | Production media storage uses private multi-zone Arvan Object Storage and CDN. | ADR-0005, OQ-018 |
| RQ-027 | Production administrator access uses first-party PostgreSQL principals and opaque OTP sessions; static tokens remain local/test only. | ADR-0005, OQ-022 |
| RQ-028 | Removing any component in the Outfit purchase panel does not modify or create an Outfit. The remaining exact component SKUs are added atomically as independent Product Cart lines, use current Product SKU prices, and remain Products through Checkout, Order and returns. A complete Outfit remains one Outfit line with its independent revision-size price. | Product Owner instruction on 2026-08-18; OTF-008–OTF-010, OTF-019–OTF-020 |
| RQ-029 | The first self-hosted Hostiran launch may use `KELE_DEPLOYMENT_TIER=uat` with Fake Payment, Fake SMS and private MinIO on the VPS until real providers are provisioned. This boundary is documented in `docs/hostiran-initial-deployment.md` and is not commercial production. | Product Owner instruction on 2026-09-28 |
| RQ-030 | Final typography is Parastoo headings with Vazirmatn body, control, label and price text (`parastoo-vazirmatn`). Legacy `estedad-vazirmatn`, `elize` and `markazi` settings remain rollback-only. | Product Owner instruction on 2026-10-06; `decisions/2026-10-06-final-typography-pairing.md`; DES-002 |

## Resolution protocol

For each answer:

1. Record the owner and decision date.
2. Add or update an ADR if alternatives or long-term consequences exist.
3. Update the affected normative specification.
4. Update OpenAPI, data model, test plan, and traceability as applicable.
5. Remove provisional UI copy that conflicts with the accepted answer.
