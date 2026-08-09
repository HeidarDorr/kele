# Render free functional demo

Status: Public, disposable, synthetic functional-UAT environment; not staging or production

This profile deploys the current KELE API, Storefront, Administration app, a
Render Postgres database and an ephemeral MinIO service in Render's Frankfurt
region. It exists for manual version-1 functional acceptance before purchasing
or provisioning production infrastructure.

The word "30-day" applies to the lifetime of the Free Render Postgres database,
not to an always-on trial of the complete stack. Render documents a shared 750
Free instance-hour allowance per workspace per calendar month. Four continuously
awake web services would consume 96 instance-hours per day and exhaust 750 hours
in about 7.8 days. Free services normally spin down after 15 minutes without
inbound traffic, so this profile is intended for bounded, on-demand test
sessions.

## Acceptance criteria

1. `render.yaml` explicitly selects the Free plan for all four web services and
   PostgreSQL; an omitted plan must never silently create a paid Starter
   resource.
2. Render uses the repository-pinned Node.js 24.18.0 and Pnpm 11.18.0 and
   installs the frozen lockfile, including development build dependencies.
3. PostgreSQL 16 is created in Frankfurt with the exact disposable database
   name `kele_e2e`. A pre-deploy command applies all migrations and the guarded
   deterministic seed; it refuses any other database name.
4. Render-managed hostnames are passed between services through Blueprint
   references. No private hostname or guessed public subdomain is compiled into
   either Next.js application.
5. Fake Payment, Fake Refund and Fake SMS remain active, customer OTP remains
   `111111`, and administrator authorization remains the static development
   adapter with generated server-side credentials.
6. MinIO credentials are generated or non-secret, the bucket is created through
   path-style S3 access, and a read/write/delete readiness marker succeeds before
   the API starts.
7. Automatic deploys are disabled. A reviewed manual deploy is required for
   every code update, and every API deploy deliberately resets only the
   synthetic `kele_e2e` fixture.
8. The public smoke command proves API readiness, seeded catalog, Storefront and
   Administration HTML through the actual `onrender.com` endpoints.

## Failure and security boundaries

- This profile runs the API with `NODE_ENV=development` because production
  configuration correctly rejects Fake providers, MinIO, structured-log-only
  monitoring and static administrator sessions. Next.js artifacts are still
  production builds. This is intentional and must not be relabelled staging.
- Do not enter real customer identities, mobile numbers, addresses, cards,
  provider credentials, administrator identities or commercial data. Every URL
  is public to the internet; share it only with intended testers.
- Free Render Postgres is limited to 1 GB, expires 30 days after creation and has
  no backups or PITR. Render documents a 14-day upgrade grace period after
  expiry, followed by deletion. This profile cannot close the M9 managed
  PostgreSQL/RPO/RTO gate.
- Free web-service filesystems are ephemeral. MinIO objects disappear on a
  service restart, redeploy or spin-down. The API recreates and probes the empty
  demo bucket while it is awake; object durability is explicitly untestable in
  this free topology.
- Cold starts can take about a minute per sleeping service. A Storefront request
  may also need to wake the API; use the smoke command or refresh after the
  dependencies become ready.
- The profile cannot certify Vandar, Kavenegar, Arvan, Grafana/Loki/Prometheus,
  managed backup/PITR, production administrator identity or release-image
  scanning. It does not change the M9 `NO-GO` decision and does not authorize
  M10.
- Stop immediately if Render's review screen shows any paid instance, disk,
  recurring charge or requested tier upgrade. No purchase is part of this
  profile.
- Render permits only one active Free Postgres database per workspace. If the
  workspace already has one, this Blueprint must fail instead of replacing it
  or upgrading either database.

## One-time deployment

The Blueprint must exist on the remote feature branch before Render can read
it. Pushing still requires explicit repository-owner approval under
`AGENTS.md`.

After the commit is pushed:

1. Sign in to Render with the GitHub identity that can read
   `HeidarDorr/kele`.
2. Open the branch-specific
   [Deploy to Render page](https://render.com/deploy?repo=https%3A%2F%2Fgithub.com%2FHeidarDorr%2Fkele%2Ftree%2Ffeat%2Fm09-production-hardening).
3. Review the proposed resources. The list must contain exactly one Free
   Postgres database and these four Free web services:
   `kele-m9-demo-storage`, `kele-m9-demo-api`,
   `kele-m9-demo-storefront`, and `kele-m9-demo-admin`.
4. Confirm that the region is Frankfurt, no disk exists, and every plan says
   Free. Only then select **Deploy Blueprint**.
5. Wait until PostgreSQL, Storage, API, Storefront and Administration all report
   `Live`. The API log must contain both the deterministic seed result and
   `Render demo storage bucket passed read/write/delete readiness.`
6. Copy the three public origins from the API, Storefront and Administration
   service pages. Do not copy a private hostname.

If the button cannot find the branch, use **New > Blueprint**, connect the
repository, select `feat/m09-production-hardening`, and keep the default
Blueprint path `render.yaml`.

## Wake and verify

Set the three actual origins in a local PowerShell window:

```powershell
$env:KELE_RENDER_API_ORIGIN='https://<api-host>.onrender.com'
$env:KELE_RENDER_STOREFRONT_ORIGIN='https://<storefront-host>.onrender.com'
$env:KELE_RENDER_ADMIN_ORIGIN='https://<admin-host>.onrender.com'
corepack pnpm@11.18.0 demo:render:smoke
```

The smoke command retries cold services for up to four minutes. After it passes,
open the Storefront and Administration origins. Use synthetic Iranian mobile
numbers and OTP `111111`. Fake payment and refund outcomes prove application
orchestration only; they do not contact a bank, Vandar or Kavenegar.

Useful read-only checks:

- API liveness: `https://<api-host>.onrender.com/api/v1/health/live`
- API readiness: `https://<api-host>.onrender.com/api/v1/health/ready`
- Seeded catalog: `https://<api-host>.onrender.com/api/v1/catalog/products`
- Logs: open each service in Render and select **Logs**.

## Reset, sleep, update and remove

- **Sleep without deleting data:** stop sending requests. Each free web service
  spins down after approximately 15 idle minutes. PostgreSQL remains until its
  expiry; MinIO object data is not retained.
- **Reset the synthetic database:** on the API service select **Manual Deploy >
  Deploy latest commit**. Its guarded pre-deploy step migrates, truncates and
  reseeds only `kele_e2e`. Do this only when no tester is using the demo.
- **Deploy a reviewed code update:** first obtain push approval and push the
  reviewed commit to the feature branch. Then manually deploy API, Storefront
  and Administration. Auto-deploy is intentionally off.
- **Remove the demo before day 30:** delete all four web services and the Free
  Postgres database from their Render **Settings** pages, then disconnect/delete
  the Blueprint. Disconnecting a Blueprint alone does not delete its resources.
  Database deletion is irreversible but permitted here only for this explicitly
  disposable synthetic environment.

Render's current limits and procedures are documented in
[Deploy for Free](https://render.com/docs/free), the
[Blueprint specification](https://render.com/docs/blueprint-spec), and
[Render Blueprints](https://render.com/docs/infrastructure-as-code).
