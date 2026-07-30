# KELE version-1 milestone execution playbook

Version: 1.0

Status: Ready for use

Last reviewed: 2026-07-30

This playbook is the copy-ready control surface for developing KELE in separate,
sequential Codex chats. The repository is the context package: do not attach
the specification files again when a new chat is opened from this project.

## Operating model

Use one persistent monitor chat and one fresh implementation chat per
milestone. Never run two implementation milestones concurrently in the same
working tree.

The sequence is:

1. Open or return to the monitor chat.
2. Ask it to verify the current milestone branch and issue a gate decision.
3. After a `GO`, merge the reviewed branch into local `main`.
4. Confirm that local `main` is clean and passing.
5. Open the next milestone chat from the project.
6. Paste that milestone's prompt and let it create one Goal.
7. Return to the monitor only after the implementation chat reports completion.

Pushing, merging to a remote, deploying, changing production credentials,
changing accepted ADRs/Frozen requirements and publishing customer-facing
legal, pricing, shipping or return claims still require explicit user approval.

## Model and effort matrix

| Chat | Recommended model | Effort | Why |
|---|---|---:|---|
| Monitor | GPT-5.6 Terra | medium | Efficient inspection, tracking and gate reports |
| Milestone 1 | GPT-5.6 Terra | high | Broad scaffolding with controlled cost |
| Milestone 2 | GPT-5.6 Sol | high | Domain, API, admin and high-fidelity storefront work |
| Milestone 3 | GPT-5.6 Sol | high | Authentication, authorization and cart edge cases |
| Milestone 4 | GPT-5.6 Sol | xhigh | Money, concurrency, inventory and callback correctness |
| Milestone 5 | GPT-5.6 Sol | high | Complex Outfit resolution plus visual product flows |
| Milestone 6 | GPT-5.6 Sol | high | State machines, refunds, permissions and operations UI |
| Milestone 7 | GPT-5.6 Sol | high | Editorial modeling plus image-led frontend work |
| Milestone 8 | GPT-5.6 Sol | xhigh | Cross-route visual reasoning and accessibility closure |
| Milestone 9 | GPT-5.6 Sol | xhigh | Security, providers, recovery and production risk |
| Milestone 10 | GPT-5.6 Sol | high | Whole-system verification, UAT and release judgment |

If cost pressure becomes important, use Terra/high for a narrow follow-up or
routine repair after the first complete Sol implementation. Do not lower the
recommended model for Milestones 4, 8 or 9 without accepting a larger review
burden.

## Skill policy

Keep skills minimal and invoke them only when the task reaches their scope:

- `design-taste-frontend` for visually important storefront work;
- `playwright` for browser-based acceptance and visual evidence;
- `browser:control-in-app-browser` only when the in-app browser is required;
- no image-generation skill for recreating the supplied interface references;
  the references are implementation evidence, not a request for synthetic
  replacement screens.

The milestone prompts explicitly name applicable skills. Do not combine several
overlapping visual-design skills in one milestone.

## Prompt 0 — persistent monitor chat

Recommended model: GPT-5.6 Terra

Recommended effort: medium

```text
You are the persistent delivery monitor and release-gate reviewer for KELE
version 1. Work from the repository at C:\Users\Dev\Desktop\kele.

Create one Goal with this objective:
"Monitor the sequential delivery of KELE version 1, independently verify every
milestone against the repository specifications and Definition of Done, and
prevent the next milestone from starting when evidence is incomplete."

Your default mode is read-only review. Do not implement product features, do
not create parallel implementation work, and do not merge, push or deploy
unless I explicitly request that exact action.

At the beginning, read AGENTS.md, docs/spec-index.md, docs/roadmap.md,
docs/definition-of-done.md, docs/open-questions.md,
docs/requirements-traceability.md and the accepted ADRs. Inspect the current Git
branch, status, graph and available milestone evidence.

Whenever I tell you that a milestone is complete:
1. Identify the exact branch and commits under review.
2. Compare the delivered scope with that milestone in docs/roadmap.md.
3. Verify applicable business-rule IDs, OpenAPI/schema changes, migrations,
   tests, architecture boundaries, documentation and operational impact.
4. Run or inspect the full applicable quality gates; do not accept a claimed
   pass without reproducible evidence.
5. For UI work, inspect desktop, tablet and mobile evidence plus loading, empty,
   error, unavailable, disabled and success states.
6. List blocking defects separately from non-blocking debt.
7. Check that no out-of-scope feature or unnecessary framework was introduced.
8. Give exactly one gate result: GO, CONDITIONAL GO or NO-GO.
9. For GO, state the safe local merge command/sequence and name the next
   milestone prompt. Do not execute the merge without my explicit request.
10. For CONDITIONAL GO or NO-GO, give a finite remediation checklist that I can
    paste into the same implementation chat.

Maintain a compact progress table in your responses with milestone, branch,
commit, gate, test evidence and remaining decision dependencies. Re-read only
the documents relevant to a change, but perform a repository-wide consistency
check when business scope, an accepted decision, architecture or a public
workflow changes.

The product milestones must remain sequential. Provider choices OQ-002-PROD and
OQ-003-PROD block production integration, not earlier domain development.
Design inputs DES-001 through DES-005 may use documented provisional values
until their roadmap gate, but no provisional asset or claim may silently become
production-approved.
```

## Prompt 1 — workspace and engineering foundation

Recommended model: GPT-5.6 Terra

Recommended effort: high

```text
Implement Milestone 1, "workspace and engineering foundation", for KELE in
C:\Users\Dev\Desktop\kele.

Create one Goal with this objective:
"Complete and verify KELE Milestone 1 so a clean clone can reproducibly start,
test and build the NestJS API, Next.js storefront and Next.js administration
app with the approved engineering foundations."

Before editing:
1. Read AGENTS.md and all documents required by its source-of-truth order.
2. Read docs/roadmap.md Milestone 1, docs/definition-of-done.md, accepted ADRs,
   docs/security.md, docs/testing-strategy.md, docs/deployment-runbook.md,
   docs/design-system.md, docs/ui-acceptance.md and docs/openapi.yaml.
3. Inspect Git status and history. Do not discard existing work.
4. Start from the latest reviewed local main. Create one short-lived branch
   named feat/m01-engineering-foundation. If the current branch is not the
   reviewed local main, stop and report the exact mismatch.
5. Write explicit acceptance criteria and failure cases in the implementation
   plan before changing files.

Deliver the entire Milestone 1 scope in docs/roadmap.md:
- pin the maintained Node.js LTS and package manager;
- scaffold the TypeScript workspace;
- create the NestJS API, Next.js storefront and Next.js administration app;
- configure PostgreSQL and MinIO for development;
- enforce strict TypeScript, formatting, linting and architecture boundaries;
- establish unit, integration, contract and end-to-end test harnesses;
- add CI with OpenAPI validation and dependency/secret scanning;
- add validated configuration, structured logging and correlation IDs;
- add readiness/liveness health checks and a deterministic seed framework;
- establish fa-IR, RTL, logical CSS and KELE token foundations;
- add provider-neutral Fake Payment and Fake SMS adapters without production
  credentials.

Use the smallest justified dependency set. Do not add Redis, BullMQ,
RabbitMQ, Kafka, Elasticsearch, GraphQL, microservices or speculative
frameworks. Do not build business features assigned to later milestones.

Update documentation in the same branch for commands, environment variables,
architecture boundaries, CI and operational setup. Add no placeholder success
paths, hidden TODOs or fake passing tests.

Run every applicable baseline check from a clean install, including format,
lint, strict type-check, unit tests, PostgreSQL integration harness, architecture
boundary tests, OpenAPI validation, production builds and the end-to-end smoke
harness. Make small Conventional Commits only after the related checks pass.
Do not push, merge or deploy.

Finish only when the milestone exit criterion and docs/definition-of-done.md are
satisfied. Your final report must contain branch and commit hashes, delivered
scope, commands and results, migrations/environment impact, security impact,
known non-blocking limitations and exact evidence for the monitor chat.
```

## Prompt 2 — catalog vertical slice

Recommended model: GPT-5.6 Sol

Recommended effort: high

Required skills: `design-taste-frontend`, then `playwright`

```text
Implement Milestone 2, "catalog vertical slice", for KELE in
C:\Users\Dev\Desktop\kele.

Use the design-taste-frontend skill for the visually important storefront work
and the playwright skill for browser acceptance and screenshot evidence. Read
each named skill completely before acting and follow it without introducing
unapproved design behavior.

Create one Goal with this objective:
"Complete and verify KELE Milestone 2: an administrator can publish a valid
Product/ColorVariant/SKU catalog item and a customer can discover and view it
through a faithful, responsive and accessible storefront experience."

Before editing, read AGENTS.md; docs/roadmap.md Milestone 2;
docs/definition-of-done.md; docs/02-domain-model.md;
docs/03-business-rules.md; docs/04-cms-workflows.md; docs/openapi.yaml;
docs/data-model.md; docs/design-system.md; docs/ui-acceptance.md;
docs/requirements-traceability.md; docs/open-questions.md; and ADR-0001 and
ADR-0002. Inspect all three supplied reference images at their original
resolution.

Start from the latest reviewed local main and require a clean status. Create
feat/m02-catalog-vertical-slice. If the prerequisite is not true, stop and
report it. Write acceptance criteria and failure cases before implementation.

Implement the smallest complete vertical behavior:
- Product, ColorVariant, SKU, Media and Category ownership and persistence;
- publication validators mapped to the applicable CAT and PUB rule IDs;
- immutable price and inventory ledger facts with current projections;
- administration create, edit, validate, preview and publish workflow;
- REST /api/v1 public category, catalog and product-detail contracts;
- storefront shell, product/category discovery and product detail experience;
- PostgreSQL version-1 search behavior required for this slice;
- responsive media, focal-point behavior, SEO metadata, structured data,
  semantic HTML and accessibility states.

Update OpenAPI and schema contracts before their consumers. Keep Prisma inside
infrastructure. Keep money in integer IRR and centralize toman presentation.
Do not implement cart, checkout, Wishlist, Newsletter or speculative catalog
features.

Use the supplied screenshots as visual direction and objective evidence, never
as unrecorded business rules. Where a screen is missing, extrapolate one
coherent KELE visual language from docs/design-system.md and record the chosen
UI behavior in docs/ui-acceptance.md when it affects acceptance. Do not use a
default shadcn look, generic SaaS cards, gradients or unrelated generated
imagery.

Test domain invariants, publication failures, persistence, authorization,
OpenAPI contracts and the publish-to-storefront path. With Playwright, verify
desktop, tablet and mobile plus loading, empty, error, unavailable and success
states, keyboard/focus behavior, RTL and mixed-direction identifiers. Save
reviewable screenshots or visual-diff evidence in the repository's documented
evidence location.

Run all applicable quality gates, update traceability and documentation, and
make coherent Conventional Commits. Do not push, merge or deploy. Finish with
branch/commit hashes, rules covered, schema/migration impact, test/build output,
visual evidence paths, risks and a monitor-ready completion report.
```

## Prompt 3 — identity, customer and cart

Recommended model: GPT-5.6 Sol

Recommended effort: high

Required skill: `playwright`

```text
Implement Milestone 3, "identity, customer and cart", for KELE in
C:\Users\Dev\Desktop\kele. Use the playwright skill for browser acceptance and
read it completely before acting.

Create one Goal with this objective:
"Complete and verify KELE Milestone 3 so an anonymous customer can browse and
build a cart, securely authenticate with fake-provider OTP, merge carts
deterministically and manage owned profile/address data without bypassing
checkout-blocking rules."

Read AGENTS.md, docs/roadmap.md Milestone 3, docs/definition-of-done.md,
docs/02-domain-model.md, relevant identity/cart/address rules in
docs/03-business-rules.md, docs/openapi.yaml, docs/data-model.md,
docs/security.md, docs/testing-strategy.md, docs/ui-acceptance.md,
docs/requirements-traceability.md, docs/open-questions.md and all applicable
ADRs. Start only from a clean, reviewed local main containing Milestone 2.
Create feat/m03-identity-customer-cart.

Write acceptance criteria, abuse cases and failure scenarios first. Update
OpenAPI/schema contracts before consumers, then implement:
- OTP challenges, rate limits, replay/expiry handling and secure server-managed
  sessions using the fake SMS adapter;
- customer profile and strictly owned addresses;
- anonymous and authenticated cart lifecycle;
- deterministic guest-cart merge exactly matching CRT-013 through CRT-018,
  including quantity caps and notification, unavailable lines and
  Outfit-Revision requires-review behavior;
- current price and inventory revalidation;
- sign-in, profile, addresses, cart drawer/page and all required UI states.

Do not invent real SMS behavior, store raw OTP values insecurely, trust
client-side ownership, replace Outfit revisions automatically or implement
checkout. Keep provider boundaries replaceable and do not add unnecessary
state-management or messaging infrastructure.

Test OTP abuse/expiry/replay, session fixation and logout, horizontal
authorization, concurrent cart updates, deterministic merge, inventory caps and
checkout blockers. Verify API contracts and use Playwright for desktop, tablet,
mobile, RTL, keyboard and complete UI-state coverage.

Update traceability, security notes and workflow documentation. Run applicable
format, lint, type-check, unit, integration, architecture, contract, build and
E2E checks. Commit coherent verified increments. Do not push, merge or deploy.
End with monitor-ready evidence including branch/commits, covered rule IDs,
migrations, security impact, checks and screenshot paths.
```

## Prompt 4 — checkout, reservation, payment and order creation

Recommended model: GPT-5.6 Sol

Recommended effort: xhigh

Required skill: `playwright`

```text
Implement Milestone 4, "checkout, reservation, payment and order creation", for
KELE in C:\Users\Dev\Desktop\kele. Use the playwright skill for checkout browser
acceptance and read it completely before acting.

Create one Goal with this objective:
"Complete and adversarially verify KELE Milestone 4: a valid product cart can be
quoted, reserved, paid through the fake adapter and converted exactly once into
an immutable paid Order without overselling or accepting forged/replayed
callbacks."

Read AGENTS.md, docs/roadmap.md Milestone 4, docs/definition-of-done.md,
docs/02-domain-model.md, all checkout/shipping/inventory/payment/order rules in
docs/03-business-rules.md, docs/openapi.yaml, docs/data-model.md,
docs/security.md, docs/testing-strategy.md, docs/deployment-runbook.md,
docs/requirements-traceability.md, docs/open-questions.md, ADR-0001 and
ADR-0004, plus the approved checkout clarification decision.

Start only from clean, reviewed local main containing Milestone 3 and create
feat/m04-checkout-payment-order. First write acceptance criteria, invariants,
failure scenarios and a concurrency test matrix.

Update OpenAPI and database contracts before consumers, then implement:
- CheckoutSession quote and versioned shipping-method settings;
- Iran Post, Tipax and Tehran Local Courier fixed-price behavior;
- Tehran eligibility validation;
- free-shipping eligibility based only on Products and Outfits Order Subtotal,
  excluding shipping, discounts and taxes;
- transactional SKU reservation with no negative inventory;
- database-backed, idempotent expiry and recovery jobs;
- payment abstraction and fake provider;
- authenticated, verified, replay-safe and idempotent callback handling;
- exactly-once commercial Order creation after verified success;
- immutable price, address and shipping snapshots plus atomic stock deduction;
- reconciliation behavior and checkout/payment-result UI.

One command owns one transaction. Business-critical consistency must not depend
on an asynchronous job. Publish events only after commit. Keep all callbacks
idempotent. Do not add a real payment provider, Redis, BullMQ or an external
event bus.

Test concurrent last-unit checkout, reservation expiry races, repeated and
out-of-order callbacks, forged callbacks, client amount tampering, stale price,
unavailable lines, job retries, partial failures and reconciliation. Verify
that no scenario creates duplicate orders or negative inventory. Use
Playwright for the complete customer path and every payment outcome/state.

Run all quality gates and update API, schema, operational, security and
traceability documentation. Make coherent Conventional Commits only after
verification. Do not push, merge or deploy. End with monitor-ready branch and
commit evidence, rule coverage, migrations, concurrency results, UI evidence,
risks and rollback notes.
```

## Prompt 5 — Outfit

Recommended model: GPT-5.6 Sol

Recommended effort: high

Required skills: `design-taste-frontend`, then `playwright`

```text
Implement Milestone 5, "Outfit", for KELE in
C:\Users\Dev\Desktop\kele. Use design-taste-frontend for the customer-facing
Outfit experience and playwright for acceptance evidence; read both skills
completely before acting.

Create one Goal with this objective:
"Complete and verify KELE Milestone 5 so immutable Outfit revisions resolve
selected Outfit sizes to exact component SKUs, derive availability and price,
and participate safely in publication, cart, reservation, payment and order
history."

Read AGENTS.md, docs/roadmap.md Milestone 5, docs/definition-of-done.md,
docs/02-domain-model.md, all OTF/INV/cart/order rules in
docs/03-business-rules.md, docs/04-cms-workflows.md, docs/openapi.yaml,
docs/data-model.md, docs/design-system.md, docs/ui-acceptance.md,
docs/requirements-traceability.md, docs/open-questions.md and ADR-0003 plus
ADR-0004. Start from clean, reviewed local main containing Milestone 4 and
create feat/m05-outfit.

Write acceptance criteria, resolution examples and failure cases first. Update
OpenAPI/schema contracts before consumers, then implement:
- authoring and immutable publication revisions;
- exact Outfit-size to component-SKU mappings;
- derived price and availability without stored Outfit inventory;
- administration validation, preview and publication;
- Outfit discovery and detail experiences;
- cart line identity tied to the referenced revision;
- atomic all-or-nothing component reservations;
- immutable order snapshots and historical rendering;
- requires-review handling when a referenced revision is no longer purchasable.

Never mutate a published revision, silently replace a cart revision, reserve
only some components or create synthetic Outfit stock. Do not duplicate SKU
inventory logic outside its owning module.

Test all size mappings, missing/invalid components, last-unit contention,
mixed Product/Outfit carts, revision history, merge behavior, reservation
rollback and snapshot immutability. Use Playwright for responsive, accessible
and RTL admin/customer flows with all required states and visual evidence.

Run all applicable gates, update traceability and docs, and commit coherent
verified increments. Do not push, merge or deploy. End with branch/commit
hashes, covered rules, migration/API impact, concurrency evidence, screenshots,
risks and a monitor-ready completion report.
```

## Prompt 6 — operations, fulfillment and returns

Recommended model: GPT-5.6 Sol

Recommended effort: high

Required skill: `playwright`

```text
Implement Milestone 6, "operations, fulfillment and returns", for KELE in
C:\Users\Dev\Desktop\kele. Use the playwright skill for administration and
customer journey acceptance; read it completely before acting.

Create one Goal with this objective:
"Complete and verify KELE Milestone 6 so authorized operations staff can
fulfill, track, cancel, return and refund orders with an immutable audit trail,
while customers can view orders and submit only eligible return requests."

Read AGENTS.md, docs/roadmap.md Milestone 6, docs/definition-of-done.md,
docs/02-domain-model.md, applicable order/fulfillment/return/inventory/price
rules in docs/03-business-rules.md, docs/04-cms-workflows.md,
docs/openapi.yaml, docs/data-model.md, docs/security.md,
docs/testing-strategy.md, docs/ui-acceptance.md,
docs/requirements-traceability.md, docs/open-questions.md and applicable ADRs.
Start from clean, reviewed local main containing Milestone 5 and create
feat/m06-operations-fulfillment-returns.

Write role permissions, transition acceptance criteria, illegal transitions and
failure cases first. Update contracts before consumers, then implement:
- authorized order administration and explicit fulfillment state transitions;
- tracking data and customer visibility;
- cancellation, return and refund workflows;
- the 24-hour window after confirmed delivery, customer condition declarations
  and administrator approval;
- provider-neutral refund behavior compatible with the fake payment adapter;
- Instagram inventory actions;
- searchable audit/event exploration;
- safe, validated and auditable price/inventory bulk operations;
- customer order list/detail and return-request flows.

Historical facts are immutable. Never authorize from UI state, mutate an old
order snapshot, bypass inventory ledgers, perform a destructive bulk operation
without preview/validation or claim a real refund before provider confirmation.

Test every allowed and forbidden state transition, clock boundaries, repeated
commands, refund retries, role/ownership failures, concurrent inventory updates
and bulk-operation partial failures. Use Playwright for staff and customer
flows, RTL, accessibility, responsive behavior and complete UI states.

Run all gates, update contracts, runbooks, security and traceability docs, then
make coherent Conventional Commits. Do not push, merge, deploy or use production
credentials. Finish with branch/commit evidence, transition/rule coverage,
migrations, test results, screenshots, risks and rollback notes for the monitor.
```

## Prompt 7 — editorial platform and site settings

Recommended model: GPT-5.6 Sol

Recommended effort: high

Required skills: `design-taste-frontend`, then `playwright`

```text
Implement Milestone 7, "editorial platform and site settings", for KELE in
C:\Users\Dev\Desktop\kele. Use design-taste-frontend for the image-led
storefront/editorial experience and playwright for browser acceptance; read
both skills completely before acting.

Create one Goal with this objective:
"Complete and verify KELE Milestone 7 so authorized editors can safely preview
and publish homepage, Journal, discovery and versioned site-setting content,
and customers receive SEO-ready, coherent KELE storefront experiences."

Read AGENTS.md, docs/roadmap.md Milestone 7, docs/definition-of-done.md,
docs/03-business-rules.md, docs/04-cms-workflows.md, docs/openapi.yaml,
docs/data-model.md, docs/design-system.md, docs/ui-acceptance.md,
docs/security.md, docs/requirements-traceability.md, docs/open-questions.md and
applicable ADRs. Inspect all supplied reference images at original resolution.
Start from clean, reviewed local main containing Milestone 6 and create
feat/m07-editorial-platform.

Write content lifecycle, permissions, acceptance criteria and failure cases
before implementation. Update API/schema contracts before consumers, then
implement:
- typed homepage sections, ordering, preview and publication;
- safe media reference and deletion behavior;
- Journal authoring, preview, publishing, scheduling if already specified, SEO
  metadata and public routes;
- category and occasion discovery content;
- versioned, audited site settings;
- corresponding responsive storefront pages and navigation.

Do not create a generic page builder, allow arbitrary unsafe markup, silently
delete referenced media, publish unapproved legal/pricing/shipping/returns copy
or add Newsletter. Extrapolate missing screens from the approved KELE visual
language and document acceptance behavior.

Test draft/published isolation, preview authorization, slug conflicts,
publication validation, media references, cache/revalidation behavior, SEO and
audit history. Use Playwright for editor and customer paths at all viewports,
RTL/accessibility, required states and visual evidence.

Run all applicable gates, update API/schema/workflow/traceability docs and make
coherent verified commits. Do not push, merge or deploy. End with monitor-ready
branch/commit evidence, covered rules, migrations, checks, screenshots, risks
and content-approval dependencies.
```

## Prompt 8 — storefront experience and visual fidelity

Recommended model: GPT-5.6 Sol

Recommended effort: xhigh

Required skills: `design-taste-frontend`, then `playwright`

```text
Implement Milestone 8, "storefront experience and visual fidelity", for KELE in
C:\Users\Dev\Desktop\kele. Use design-taste-frontend for the visual system and
playwright for deterministic screenshot and journey evidence; read both skills
completely before acting.

Create one Goal with this objective:
"Complete and objectively verify the entire KELE version-1 storefront and
customer experience across desktop, tablet and mobile, matching supplied
references and approved extrapolations without changing business behavior."

Read AGENTS.md, docs/roadmap.md Milestone 8, docs/definition-of-done.md,
docs/design-system.md, docs/ui-acceptance.md, docs/open-questions.md,
docs/requirements-traceability.md and all specifications governing visible
workflows. Inspect every supplied reference image at original resolution.
Audit all existing storefront and account routes before editing. Start from
clean, reviewed local main containing Milestone 7 and create
feat/m08-storefront-visual-fidelity.

First produce a route/state/viewport audit and measurable visual acceptance
plan. Then:
- complete every version-1 route and cross-route navigation;
- consolidate prior work into one KELE token, typography, spacing, imagery,
  iconography and motion system;
- reproduce the supplied homepage/PDP direction closely;
- extrapolate missing PLP, search, cart, checkout, payment, account, orders,
  returns, Outfit and Journal screens in the same visual grammar;
- complete loading, empty, error, disabled, unavailable, requires-review and
  success states;
- complete semantic structure, keyboard/focus, contrast, alt text,
  reduced-motion and mixed-direction behavior;
- establish stable visual-regression fixtures and screenshot baselines;
- resolve DES-001 through DES-005 with approved assets/behavior or document
  explicit launch blockers and provisional fallbacks.

This milestone may refine presentation and frontend structure but must not
silently change API contracts or business rules. Do not use default shadcn
styling, generic templates, gratuitous animation, generated substitute product
photography or desktop-only assumptions.

Run Playwright journeys and visual comparisons for all critical routes at the
documented desktop, tablet and mobile viewports. Test slow/loading, no-data,
server/client failure, keyboard-only, reduced-motion and representative mixed
RTL/LTR data. Record objective evidence and remaining deltas.

Run all applicable repository gates, update design/UI acceptance and
traceability docs, and make coherent verified commits. Do not push, merge or
deploy. Finish with branch/commit hashes, route/state coverage, visual evidence
paths, accessibility results, performance observations, unresolved design
inputs and a monitor-ready completion report.
```

## Prompt 9 — production integrations and operational hardening

Recommended model: GPT-5.6 Sol

Recommended effort: xhigh

Required skill: `playwright` for production-like browser journeys

```text
Implement Milestone 9, "production integrations and operational hardening", for
KELE in C:\Users\Dev\Desktop\kele. Use the playwright skill for production-like
browser acceptance and read it completely before acting.

Create one Goal with this objective:
"Complete and verify KELE Milestone 9 by integrating only explicitly approved
production providers behind existing interfaces and proving security,
observability, performance, backup, recovery and rollback readiness."

Read AGENTS.md, docs/roadmap.md Milestone 9, docs/definition-of-done.md,
docs/open-questions.md, docs/security.md, docs/testing-strategy.md,
docs/deployment-runbook.md, docs/openapi.yaml,
docs/requirements-traceability.md and all provider-relevant rules/ADRs. Start
from clean, reviewed local main containing Milestone 8 and create
feat/m09-production-hardening.

Before implementation, verify explicit user-approved decisions for
OQ-002-PROD, OQ-003-PROD, OQ-017 and OQ-018. If a provider is not approved,
record it as a scoped blocker and continue independent hardening work; never
select, purchase or configure a production provider by assumption. Never expose
secrets in source, logs, tests or evidence.

Write provider acceptance, threat, load, failure/recovery and rollback criteria
first. Then, within approved scope:
- implement payment and refund provider adapters plus verification,
  idempotency, reconciliation and sandbox certification;
- implement SMS delivery adapter, limits, failure handling and safe telemetry;
- implement approved object storage/CDN and error monitoring;
- harden authentication, authorization, callbacks, uploads, headers, rate
  limits, dependency posture and secret handling;
- establish useful metrics, structured events, alerts and operator procedures;
- execute representative load/capacity tests and address measured bottlenecks;
- rehearse database migration, backup restore, provider outage and rollback;
- verify production-like end-to-end customer and administration journeys.

Do not deploy, rotate credentials, change paid tiers or run destructive
production operations. Any such action requires a separate explicit approval.
Do not introduce Redis, queues, dedicated search or microservices without a
measured need and accepted ADR.

Run full quality, security, performance and recovery gates. Update runbooks,
environment/configuration documentation, threat model, traceability and
rollback evidence. Make coherent verified commits. Do not push or merge. End
with branch/commits, approved provider decisions, test/certification evidence,
capacity observations, security findings and resolutions, recovery timings,
remaining blockers and monitor-ready rollback notes.
```

## Prompt 10 — release candidate, UAT and launch

Recommended model: GPT-5.6 Sol

Recommended effort: high

Required skill: `playwright`

```text
Execute Milestone 10, "release candidate, UAT and launch readiness", for KELE
in C:\Users\Dev\Desktop\kele. Use the playwright skill for final regression and
read it completely before acting.

Create one Goal with this objective:
"Produce and verify a traceable, recoverable KELE version-1 release candidate,
complete staging UAT and launch documentation, and deploy only if I separately
give explicit production approval."

Read AGENTS.md, docs/roadmap.md Milestone 10, docs/definition-of-done.md,
docs/spec-index.md, docs/open-questions.md,
docs/requirements-traceability.md, docs/testing-strategy.md,
docs/security.md, docs/deployment-runbook.md, docs/ui-acceptance.md,
docs/openapi.yaml and every accepted ADR. Start from clean, reviewed local main
containing Milestone 9 and create chore/m10-release-candidate.

First freeze and report the exact release-candidate scope. Build a complete
requirements/rule-to-code/test/evidence coverage report and classify every gap
as release-blocking or explicitly accepted. Verify approved logo/font/product
assets and approved customer-facing legal, privacy, pricing, shipping and
returns wording. Do not invent or publish missing claims.

Complete:
- deterministic production-like build and migration verification;
- approved content/data import or rehearsed import tooling;
- full unit, integration, architecture, contract, E2E and smoke regression;
- concurrency/idempotency regression for critical commerce flows;
- security, dependency, secret, accessibility, visual and performance gates;
- staging UAT checklist and recorded outcomes;
- backup/restore, rollback and post-deployment verification rehearsal;
- release notes, known limitations, operator handoff and launch checklist;
- a signed-off version tag only after all release gates pass.

Do not push, merge, deploy, modify production infrastructure, rotate credentials
or publish customer-facing regulated/commercial claims without my explicit
approval for that exact action. If production approval is absent, stop at a
fully verified deployment-ready release candidate.

Use Playwright to verify the complete customer and administration critical
journeys at required viewports with final approved assets. Run all quality
gates from a clean state and preserve reproducible evidence. Make coherent
release-preparation commits. Finish with the release commit/tag candidate,
coverage report, UAT results, all gate outputs, migrations, approved/blocked
claims, rollback procedure and a final GO/NO-GO recommendation for the monitor.
```

## Message to send the monitor after each milestone

```text
Milestone [number] is reported complete on branch [branch] at commit [hash].
Perform the full independent gate review from your monitor prompt. Verify the
evidence yourself, report GO / CONDITIONAL GO / NO-GO, and do not merge, push
or deploy.
```

## Message to send an implementation chat after monitor findings

```text
The monitor returned [CONDITIONAL GO or NO-GO] for this milestone. Address every
blocking item below in the same milestone branch, add or update the lowest-useful
tests and documentation, rerun all affected gates, make coherent Conventional
Commits, and return a new monitor-ready evidence report. Do not expand scope,
push, merge or deploy.

[paste the monitor remediation checklist here]
```
