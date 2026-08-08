# GitHub Codespaces functional demo

Status: Synthetic functional-UAT environment; not staging or production

This profile runs the current KELE API, Storefront, Administration app,
PostgreSQL and MinIO inside one personal GitHub Codespace. It exists so the
Product Owner can exercise implemented version-1 behavior before purchasing or
provisioning production services. It does not change ADR-0005 and cannot close
any provider, managed-recovery, observability or release-image certification.

## Acceptance criteria

1. A two-core Codespace installs the repository-pinned Node.js 24.18.0 and Pnpm
   11.18.0, then installs the frozen lockfile without an exception.
2. PostgreSQL and MinIO bind only to Codespace loopback. Storefront, API and
   Administration are forwarded with GitHub visibility `private` by default.
3. Runtime credentials are generated with cryptographic randomness into the
   ignored `.env.codespaces` file, mode `0600`; no credential is committed.
4. Migrations apply to the explicitly disposable `kele_e2e` database and the
   guarded reset installs deterministic catalog, editorial, inventory and
   synthetic shipping data.
5. The compiled Storefront, API and Administration artifacts restart after a
   Codespace resume and expose their distinct authenticated Codespaces URLs on
   ports 3000, 3001 and 3002.
6. Payment, SMS, refund, storage and administration-session adapters remain
   visibly development-only: Fake providers, fixed OTP `111111`, local MinIO
   and static development administration authorization.
7. Reset refuses any database other than the exact guarded `kele_e2e` target.

## Failure cases

- Configuration aborts outside GitHub Codespaces or when the Codespace identity
  is missing/malformed.
- An existing environment file from another Codespace is never overwritten.
- A failed dependency install, unhealthy PostgreSQL/MinIO, migration or seed
  stops setup instead of presenting a false-ready environment.
- No real Vandar/Kavenegar request is issued, no external callback is claimed,
  and no synthetic outcome is recorded as production certification.
- Codespaces sleep, deletion, free-quota exhaustion and ephemeral demo data are
  expected operational boundaries; this profile has no production backup,
  availability or recovery claim.

## Create and use

Open the repository branch in GitHub and choose **Code → Codespaces → Create
codespace**. Creation runs `.devcontainer/post-create.sh`; subsequent resumes
run `.devcontainer/post-start.sh`. In the Codespace **Ports** view, keep all
three forwarded ports `Private`.

The fixed customer and development administrator OTP is `111111`. The static
Super Admin credential is generated internally and supplied only by the Admin
server; it is not displayed or entered in the browser.

Useful commands inside the Codespace:

```text
pnpm demo:codespaces:urls
pnpm demo:codespaces:start
pnpm demo:codespaces:stop
pnpm demo:codespaces:reset
pnpm demo:codespaces:build
docker compose --env-file .env.codespaces -f docker-compose.codespaces.yml ps
tail -f .data/codespaces/api.log .data/codespaces/storefront.log .data/codespaces/admin.log
```

`demo:codespaces:reset` stops the applications, migrates and destroys/reseeds
only `kele_e2e`, then restarts the applications. Deleting the Codespace removes
the demo and its generated credentials.

## Security and evidence boundary

Do not make the forwarded ports public. Do not enter real customer, card,
provider or administrator data. Use synthetic mobile numbers and addresses.
The environment can support manual functional acceptance evidence, but it is
not the staging environment required by the Milestone 9 release gate.
