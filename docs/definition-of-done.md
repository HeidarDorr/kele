# Definition of done

A task is done only when every applicable item below is satisfied.

## Product and specification

- Acceptance criteria and failure scenarios are explicit.
- Relevant business rule IDs are linked.
- No unresolved blocking question is silently assumed.
- Any durable decision is recorded in an ADR.
- User-visible wording is approved, including price, shipping, returns, and
  legal claims.

## Implementation

- Code follows module and layer boundaries.
- Error paths are implemented; no fake success, placeholder, or hidden TODO
  remains.
- Money, time, identifiers, retries, and idempotency follow project standards.
- Migrations are reversible where practical and have a rollback/data recovery
  note.
- Environment variables are documented and secrets are never committed.

## Verification

- Format, lint, strict type-check, tests, and production build pass.
- Unit tests cover domain invariants.
- Integration tests cover persistence and module contracts.
- Critical flow changes include concurrency/idempotency tests.
- API changes pass OpenAPI validation and consumer contract tests.
- Security-sensitive changes include negative authorization and abuse tests.

## Frontend

- Desktop, tablet, and mobile acceptance viewports are checked.
- Loading, empty, error, unavailable, disabled, and success states exist.
- Keyboard navigation, visible focus, accessible names, and contrast are
  checked.
- Images are responsive, optimized, correctly cropped, and have useful alt
  text.
- A UI PR includes before/after screenshots or visual-diff evidence.
- No default shadcn/ui or generic template styling remains.

## Documentation and operations

- API, schema, environment, workflow, and runbook documentation are updated.
- Observability includes structured errors, correlation, and useful metrics.
- Data migration, deployment, rollback, and compatibility impacts are stated.
- Traceability points to the implementing code and automated tests.

## Git and review

- Branch and commit names follow `AGENTS.md`.
- Commits are coherent and do not mix unrelated formatting.
- PR description contains scope, risks, tests, screenshots, and rollback notes.
- Review comments and failing checks are resolved.

