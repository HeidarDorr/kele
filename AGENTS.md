# KELE agent operating contract

This file is binding for every human or AI contributor working in this
repository.

## 1. Mission

Build a production-grade premium ecommerce platform that implements the
approved KELE specifications without silently inventing business behavior.
Correctness, traceability, visual fidelity, security, and maintainability take
priority over raw implementation speed.

## 2. Source-of-truth order

When sources conflict, use this order:

1. Accepted ADRs in `docs/adr/`
2. Frozen documents listed in `docs/spec-index.md`
3. Identified SHALL rules in `docs/03-business-rules.md`
4. `docs/openapi.yaml`
5. Draft specifications
6. Design reference images, for presentation only
7. Existing implementation

An agent must not silently choose between conflicting sources. Record the
conflict in `docs/open-questions.md`. Stop only the affected feature; continue
independent work.

Screenshots define visual direction, not unrecorded business rules. Text such
as return windows, free-shipping thresholds, legal claims, language, and
currency shown in a screenshot must be confirmed in a requirement or setting.

## 3. Accepted technical baseline

- Runtime: current maintained Node.js LTS, pinned in the repository.
- Language: TypeScript with `strict: true`; no unexplained `any`.
- Backend: NestJS modular monolith.
- Backend structure: domain, application, infrastructure, presentation per
  module. Dependencies point inward.
- API: REST under `/api/v1`; OpenAPI is required.
- Database: PostgreSQL.
- ORM: Prisma. Prisma types must not leak into domain or application contracts.
- Frontend: Next.js App Router with React Server Components by default.
- Styling: Tailwind CSS with KELE design tokens.
- UI primitives: shadcn/ui only when the copied primitive is simplified and
  restyled for KELE. A default shadcn appearance is not acceptable.
- Server state: a dedicated query client only where client synchronization is
  required. Prefer server-rendered data for storefront pages.
- UI state: local state first; Zustand only for genuinely cross-feature client
  state such as the cart drawer.
- Authentication: mobile OTP with server-managed, secure sessions.
- Storage: S3-compatible object storage. Local filesystem storage is allowed
  only in development through the same storage interface.
- Search: PostgreSQL search for version 1.
- Jobs: database-backed, idempotent scheduled jobs in the application process
  for version 1.
- Delivery: Docker and GitHub Actions.

Redis, BullMQ, RabbitMQ, Kafka, Elasticsearch, microservices, GraphQL, and a
separate read database require a measurable need and an accepted ADR.

## 4. Architecture rules

- Modules own their data and business behavior.
- A module must not read or write another module's tables directly.
- Cross-module synchronous work uses explicit application contracts.
- Completed facts use immutable domain events.
- Business-critical consistency must not depend on an asynchronous job.
- One command owns one transaction boundary.
- Publish domain events after a successful commit. Use an outbox before any
  event is sent outside the process.
- Commands must be idempotent where retries are possible, especially payment
  callbacks, inventory reservations, returns, and job handlers.
- Inventory must never become negative.
- Money is stored as an integer in Iranian rials. Presentation may convert and
  label values in toman; conversions must be centralized and tested.
- All persisted timestamps are UTC. Presentation uses the configured business
  timezone.
- Historical order, payment, price, inventory, and audit facts are immutable.
- Domain code must not import NestJS, Prisma, HTTP, or storage SDK types.

## 5. Product and data rules

- Canonical product model: `Product -> ColorVariant -> SKU`.
- Color-specific media belongs to `ColorVariant`.
- Price and inventory belong to `SKU`.
- An outfit has immutable composition revisions. Each outfit item selects a
  product and default color variant. A sellable outfit size resolves to exact
  component SKUs before reservation.
- Outfit availability is derived from component SKU availability; it is never
  stored as inventory.
- A pre-payment `CheckoutSession` and `PaymentAttempt` may exist. A commercial
  `Order` is created only after verified successful payment.
- External callbacks must be authenticated, replay-safe, and idempotent.

## 6. Git workflow

- `main` is protected, releasable, and never used for direct feature work.
- Use one short-lived branch per coherent task:
  `feat/...`, `fix/...`, `docs/...`, `test/...`, `chore/...`.
- Do not create a branch per file or trivial edit.
- Commits are small, coherent, and follow Conventional Commits.
- Do not mix formatting-only changes with behavior changes.
- Before committing, run the checks proportional to the change.
- Every PR states: scope, linked rule IDs, decisions, test evidence, migration
  impact, security impact, screenshots for UI work, and rollback notes.
- Do not merge your own PR unless the repository policy explicitly permits it.
- Never force-push a shared branch or rewrite published history.

## 7. Actions requiring explicit approval

An agent must obtain explicit user approval before:

- pushing or merging to a remote repository;
- deploying or changing production infrastructure;
- running a destructive or irreversible migration;
- deleting production or user data;
- rotating secrets or changing payment/SMS credentials;
- purchasing services or increasing paid resource tiers;
- changing an accepted ADR or a Frozen business requirement;
- publishing customer-facing legal, pricing, shipping, or return claims.

Local branches, commits, tests, reversible development migrations, and
documentation changes inside the requested task are allowed.

## 8. Implementation workflow

For every task:

1. Read the relevant specs, ADRs, open questions, and rule IDs.
2. Write acceptance criteria and identify failure cases.
3. Update OpenAPI or schema contracts before consumer implementations.
4. Implement the smallest complete vertical behavior.
5. Add tests at the lowest useful level and at the integration boundary.
6. Run format, lint, type-check, tests, and build as relevant.
7. For UI, test required viewports and attach visual evidence.
8. Update traceability, operational docs, and ADRs when needed.
9. Commit only after verification succeeds.

Do not use placeholder implementations, fake success paths, commented-out
code, or TODOs that hide incomplete acceptance criteria.

## 9. Required quality gates

The baseline CI gates are:

- formatting
- lint
- TypeScript type-check
- unit tests
- integration tests against PostgreSQL
- architecture boundary tests
- OpenAPI validation and contract checks
- production builds for API, storefront, and administration app
- end-to-end smoke tests
- dependency and secret scanning

Critical flows require concurrency and idempotency tests.

## 10. Frontend and visual quality

- Follow `docs/design-system.md` and `docs/ui-acceptance.md`.
- Storefront is editorial, calm, image-led, and premium; do not use generic
  SaaS dashboards, excessive cards, gradients, or default component-library
  styling.
- Desktop, tablet, and mobile are first-class.
- Use semantic HTML, visible focus, keyboard operation, useful alternative
  text, reduced-motion support, and WCAG 2.2 AA contrast targets.
- Product imagery must preserve its intended aspect ratio and focal point.
- UI work is incomplete without loading, empty, error, disabled, unavailable,
  and success states.

## 11. Documentation duties

Update documentation in the same PR when changing:

- API contracts;
- database schema or migrations;
- architecture boundaries;
- business behavior;
- configuration or environment variables;
- operational procedures;
- user-visible workflows.

Use an ADR for durable decisions with meaningful alternatives. Do not create an
ADR for routine implementation details.

## 12. Definition of done

`docs/definition-of-done.md` is mandatory. A task is not complete because code
was generated; it is complete only when its acceptance, tests, evidence,
documentation, and operational impact are addressed.

