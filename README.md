# KELE

KELE is a premium direct-to-consumer ecommerce platform for formal
boyswear. The system includes a public storefront, customer accounts,
checkout, inventory and pricing, editorial content, and an
administration panel.

The repository is currently in the specification-hardening phase. Product
code must not be scaffolded until the blocking decisions in
[`docs/open-questions.md`](docs/open-questions.md) are resolved or explicitly
accepted as assumptions.

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

This branch contains planning and specification artifacts only. The first
implementation milestone is the product-to-order vertical slice described in
[`docs/roadmap.md`](docs/roadmap.md).

