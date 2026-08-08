# KELE specification index

Version: 1.3
Status: Active
Last reviewed: 2026-07-24

This index defines canonical names, authority, and readiness. File names are
authoritative; older names embedded in imported documents are legacy metadata.

| Order | File | Purpose | Status | Authority |
|---:|---|---|---|---|
| 0 | `00-glossary.md` | Shared terminology | Frozen | Normative |
| 1 | `01-project-overview.md` | Vision and version-1 scope | Draft | Normative after Frozen docs |
| 2 | `02-domain-model.md` | Business objects and ownership | Frozen, amended by ADRs | Normative |
| 3 | `03-business-rules.md` | Identified business rules | Draft | Normative for SHALL rules unless amended |
| 4 | `04-cms-workflows.md` | Administrative workflows | Draft | Supporting |
| 5 | `05-api-spec.md` | Imported narrative API draft | Draft/Superseded | Supporting only |
| 6 | `openapi.yaml` | Machine-readable API contract | Baseline | Normative for transport |
| 7 | `06-persistence-model.md` | Imported persistence proposal | Draft/Superseded in conflicts | Supporting |
| 8 | `07-system-architecture.md` | Backend architecture principles | Accepted | Normative |
| 9 | `08-frontend-system-architecture.md` | Frontend architecture principles | Accepted | Normative |
| 10 | `adr/` | Accepted decisions | Accepted individually | Highest authority |
| 11 | `decisions/2026-07-24-employer-open-questions-v1.md` | Approved employer answers incorporated into rules | Incorporated | Decision evidence |
| 12 | `decisions/2026-07-28-checkout-clarifications.md` | Approved shipping-threshold and cart-merge rules | Incorporated | Decision evidence |
| 13 | `decisions/2026-08-07-m9-production-providers.md` | Approved M9 provider and administration choices | Incorporated by ADR-0005 | Decision evidence |

## Known import corrections

- Escaped Markdown punctuation was normalized on 2026-07-24.
- `08-frontend-system-architecture.md` was renamed to
  `08-frontend-system-architecture.md`.
- Embedded document numbers in the original files are not reliable and must
  not be used for link generation.
- Duplicate product-detail reference imagery was removed before the baseline
  commit; retained visual references are catalogued in `ui-acceptance.md`.

## Change control

- A Frozen document changes only through an accepted ADR plus an explicit
  specification update.
- Draft requirements may be clarified without an ADR when behavior is not
  changed.
- All new business rules receive stable IDs.
- Employer answers are preserved under `decisions/` and incorporated into
  normative specifications; source numbering collisions are normalized without
  changing decision meaning.
- Open questions are tracked in `open-questions.md`; accepted answers must move
  into the relevant specification or an ADR.
