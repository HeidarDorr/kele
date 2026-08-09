# Liara synthetic UAT deployment

Status: locally verified operator-ready profile; external Liara deployment
evidence pending

This profile publishes the three KELE applications from one low-cost Docker
application:

- Storefront: `/`
- Administration: `/admin`
- API: `/api/v1`
- Aggregate liveness/readiness: `/__kele/health/live` and
  `/__kele/health/ready`

It is a synthetic functional-UAT environment for a small, named review group.
It is not staging or production, does not certify Vandar, Kavenegar, Arvan,
Grafana/Loki/Prometheus, managed PITR, release-image scans or final assets, and
does not close Milestone 9.

## Local acceptance evidence

On 2026-08-09 (`Asia/Tehran`) the final `liara-uat-runtime` target was built
with Docker Engine 29.6.1 and exercised against PostgreSQL with all 16 locked
migrations. The container ran as `65532:65532` with `0.5` CPU and a hard
`512 MiB` memory limit, stabilized between approximately `215-229 MiB`, reported
healthy, and had no restart or OOM event. Storefront, `/admin/login`, API
readiness and aggregate readiness all returned HTTP `200`.

A real Chrome pass verified administrator OTP sign-in, protected navigation at
`/admin/products/new`, clean browser console, secure logout and rejection of
the former session. The public customer OTP proxy also returned a real `202`
from the container. This is local portability evidence only; repeat the smoke
test below against the assigned `liara.run` origin after deployment.

## 1. Create PostgreSQL

In the same Liara account and private network as the Docker application:

1. Open **Databases** and select **Create database**.
2. Select PostgreSQL `16.10`, the Earth plan and the application's private
   network.
3. Keep public-network access disabled.
4. After creation, open the connection page and retain the **private-network**
   PostgreSQL URL. Do not paste it into a ticket, chat, Git file or screenshot.

PostgreSQL `16.10` is acceptable for this isolated UAT because it shares major
version 16 with the verified local environment. It is not approved for
production; request Liara's current PostgreSQL 16 minor before production.

## 2. Generate the UAT configuration

From the repository root, substitute the exact Liara Docker application ID:

```text
pnpm demo:liara:env -- <APP_ID>
```

The command emits a fresh set of UAT-only credentials. Copy the output into the
Docker application's environment-variable panel, replace only the
`DATABASE_URL` placeholder with the private PostgreSQL URL, and save it there.
Never save the output to a tracked file.

The generated synthetic administrator identifier is `+989000000001`. To use a
different non-customer test identifier, pass it as the second argument:

```text
pnpm demo:liara:env -- <APP_ID> +989000000002
```

Do not add E2E reset variables. The runtime refuses to start unless all of the
following boundaries agree: `NODE_ENV=production`,
`KELE_DEPLOYMENT_TIER=uat`, `KELE_UAT_BOOTSTRAP=synthetic-only`, Fake
payment/refund/SMS, PostgreSQL administrator sessions and structured local
logs. Required signing values must be non-development values of at least 32
characters.

## 3. Prepare the upload

Commit the reviewed deployment profile before creating an archive. From the
repository root:

```text
git archive --format=zip --output=kele-liara-uat.zip HEAD
```

`git archive` includes tracked files only, so it excludes local `.env` files,
dependencies, build output and the two generated `next-env.d.ts` changes. Do
not create the archive with an unrestricted file explorer ZIP operation.

## 4. Deploy the Docker application

1. Open the existing Docker application in Liara.
2. Select **New deployment**, then **Drag & Drop**.
3. Upload `kele-liara-uat.zip`.
4. Select HTTP port `3000` when Liara asks for the exposed port.
5. Keep the Docker application and PostgreSQL in the same private network.
6. Do not override `ENTRYPOINT` or `CMD`.
7. Start deployment and watch the build/runtime logs.

The root Dockerfile's final `liara-uat-runtime` stage is selected automatically.
At startup the single UAT process applies the locked additive Prisma migrations,
reconciles the deterministic catalog/editorial seed, creates the synthetic
database-backed Super Administrator when absent, starts API/Storefront/Admin on
private loopback ports, and finally opens port `3000`. This automatic migration
is an explicit single-replica UAT exception; it must not be copied to a scaled
staging or production release.

Expected log sequence:

1. Prisma reports that all migrations are applied or already current.
2. The deterministic seed is reconciled.
3. The synthetic UAT administrator is reconciled.
4. API, Storefront and Admin report ready.
5. `KELE synthetic UAT is ready on port 3000` is printed.

If the process is killed for memory on the Earth plan, change only the Docker
application to the Mars plan and redeploy. Do not upgrade PostgreSQL merely to
compensate for application-process memory.

## 5. Smoke test

For an application ID `<APP_ID>`, verify:

```text
https://<APP_ID>.liara.run/__kele/health/ready
https://<APP_ID>.liara.run/
https://<APP_ID>.liara.run/admin/login
https://<APP_ID>.liara.run/api/v1/health/ready
```

The two health endpoints must return HTTP `200`. Then test:

- Customer sign-in: any explicitly synthetic `+98` test mobile and OTP
  `111111`.
- Administrator sign-in: the configured `KELE_UAT_ADMIN_MOBILE` and OTP
  `111111`.
- Catalog, product/outfit detail, cart, checkout and Fake Payment journeys.
- Administration catalog, inventory, outfit, editorial and operations reads;
  use only synthetic changes.

The fixed OTP and Fake Payment are intentionally visible test controls. Share
the URL only with the intended reviewer and never enter real customer,
commercial, payment or address data.

## 6. Failure and rollback

- Build failure: retain the build log and do not modify provider gates merely
  to make the container start.
- `502`: inspect which internal process failed in the application log.
- `503` readiness: inspect PostgreSQL private-network connectivity and
  migrations first.
- Memory termination: upgrade the Docker application from Earth to Mars.
- Bad release: select the previous successful deployment in Liara and roll the
  application back. Keep the additive database schema; do not reverse a
  migration after UAT writes.

Deleting or resetting the managed database is destructive and requires an
explicitly authorized reset. A normal redeployment is idempotent and preserves
the reviewer's synthetic test changes.

## Cost and security boundary

The intended starting topology is one Earth Docker application plus one Earth
PostgreSQL database. No Object Storage service is required by the currently
exposed UAT flows. The placeholder S3 configuration is never contacted by an
exposed upload route and does not certify storage behavior.

Keep PostgreSQL public access disabled, do not reuse the generated secrets in
another environment, and rotate/remove the UAT values when this demo is
decommissioned.
