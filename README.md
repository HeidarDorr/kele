# KELE

KELE is a premium direct-to-consumer ecommerce platform for formal
boyswear. The system includes a public storefront, customer accounts,
checkout, inventory and pricing, editorial content, and an
administration panel.

Specification hardening is complete and the first employer decision set has
been incorporated. Engineering foundation and catalog work may begin. Features
affected by the remaining blocking clarifications in
[`docs/open-questions.md`](docs/open-questions.md) must stop at their defined
decision gates.

## Authoritative documents

1. [`AGENTS.md`](AGENTS.md) — execution rules for humans and coding agents.
2. [`docs/spec-index.md`](docs/spec-index.md) — document authority and status.
3. [`docs/03-business-rules.md`](docs/03-business-rules.md) — identified
   business requirements.
4. [`docs/adr/`](docs/adr/) — accepted technical and domain decisions.
5. [`docs/openapi.yaml`](docs/openapi.yaml) — machine-readable API contract.

## Accepted stack

- Node.js LTS and TypeScript in strict mode
- NestJS modular monolith
- PostgreSQL and Prisma ORM
- Next.js App Router
- Tailwind CSS and selectively adopted shadcn/ui primitives
- In-process CQRS
- S3-compatible object storage
- GitHub Actions and Docker

Redis, a message broker, Elasticsearch, and microservices are not baseline
dependencies. They require evidence and an ADR.

## Repository state

The current specification package is ready for Milestone 1. The first complete
business implementation target remains the product-to-order vertical slice
described in [`docs/roadmap.md`](docs/roadmap.md).
