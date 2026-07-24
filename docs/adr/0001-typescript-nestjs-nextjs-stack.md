# ADR-0001: TypeScript, NestJS, PostgreSQL, Prisma, and Next.js

Status: Accepted  
Date: 2026-07-24  
Decision owners: Product owner and architecture  
Supersedes: Framework-specific recommendations in the imported stack proposal

## Context

KELE requires a maintainable ecommerce system with storefront SEO, rich
administration workflows, strict inventory behavior, and long-lived module
boundaries. The product owner has production familiarity with the JavaScript
ecosystem and prefers NestJS over ASP.NET Core.

The imported architecture already requires a modular monolith, Clean
Architecture, in-process CQRS, and technology-independent domain logic. The
framework must serve those constraints rather than replace them.

## Decision

Use a TypeScript monorepo with:

- current maintained Node.js LTS, pinned by `.nvmrc` and package `engines`;
- pnpm workspaces with the exact package manager version pinned in
  `packageManager`;
- NestJS for a single deployable modular-monolith API;
- PostgreSQL as the transactional source of truth;
- Prisma for schema migrations and infrastructure persistence;
- Next.js App Router for the storefront and administration application;
- Tailwind CSS with project-owned design tokens;
- selected shadcn/ui primitives copied into project ownership and fully
  restyled;
- REST `/api/v1` with OpenAPI;
- in-process CQRS and domain events;
- Docker for reproducible environments;
- GitHub Actions for continuous integration.

Start without a monorepo task orchestrator. Use explicit pnpm workspace scripts.
Introduce Turborepo or Nx only if build/test orchestration becomes measurably
slow or boundary tooling requires it.

Use a workspace layout with independently buildable applications:

```text
apps/
  api/
  storefront/
  admin/
packages/
  api-contract/
  config/
  design-system/
  testing/
```

Backend business modules remain under the API application and contain explicit
domain, application, infrastructure, and presentation boundaries.

Prisma clients and generated types are infrastructure details. Repositories
map persistence records to domain entities and do not return Prisma models.

OpenAPI is contract-first. CI lints `docs/openapi.yaml` and generates
TypeScript transport types/clients. Nest request DTOs perform runtime
validation and contract tests prevent drift. Generated transport types are not
domain entities.

In-process CQRS uses project-owned application interfaces and handlers.
`@nestjs/cqrs` may be used in the composition/presentation boundary, but NestJS
decorators and base classes must not enter Domain.

Next.js Server Components are the default for read-oriented storefront pages.
Client Components are introduced only for interaction. Public catalog pages
must produce useful HTML without requiring client JavaScript.

## Version policy

Exact versions are pinned when the codebase is scaffolded. “Latest” is not a
version policy. Upgrade PRs must pass the full quality gates and document
breaking changes.

## Deliberately excluded from baseline

- Redis
- BullMQ
- RabbitMQ or Kafka
- Elasticsearch
- microservices
- GraphQL
- Kubernetes
- a separate read database

Each requires a measured problem and a new ADR.

## Job execution

Version 1 uses a database-backed job table and a scheduler inside the API
deployment. Jobs claim work using a transactional lease, have an idempotency
key, use bounded retry with backoff, and move exhausted work to a failed state
for operator review.

This is sufficient for reservation expiration, notification attempts, and
non-critical housekeeping. If multiple API replicas create operational
pressure or throughput demands an external queue, the change requires an ADR.

## Consequences

Benefits:

- one language across backend and frontend;
- strong TypeScript tooling and shared generated API contracts;
- good SSR/SEO capability;
- familiar ecosystem for the product owner;
- straightforward local and CI environments.

Costs and risks:

- TypeScript's type safety ends at runtime boundaries, requiring validation;
- NestJS makes it easy to couple domain code to decorators unless boundaries
  are enforced;
- Prisma models can leak into business code without mapping discipline;
- CPU-heavy image work must run outside request handlers;
- Node concurrency does not remove database concurrency requirements.

## Guardrails

- TypeScript `strict` mode is mandatory.
- Runtime input validation is mandatory at HTTP and job boundaries.
- Architecture tests prohibit imports from domain/application into NestJS or
  Prisma packages.
- Inventory and payment correctness is enforced by PostgreSQL transactions,
  constraints, row-level locking where justified, idempotency keys, and tests.
- Shared packages must not become a dumping ground for business logic.

## Alternatives considered

- ASP.NET Core and EF Core: technically excellent, but rejected because the
  owner prefers the TypeScript ecosystem and the architecture does not depend
  on C#.
- TypeORM: rejected due to weaker preference for explicit schema/migration
  control in this project.
- Drizzle: viable, but Prisma is selected for mature tooling and team
  accessibility. Reconsider only with a concrete limitation.
- Separate backend services: rejected as premature operational complexity.
