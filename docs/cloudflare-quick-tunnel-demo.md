# Cloudflare Quick Tunnel functional demo

Status: Public, temporary, synthetic functional-UAT environment; not staging or production

This profile runs the KELE API, Storefront, Administration app, PostgreSQL and
MinIO on the operator's computer. Three anonymous Cloudflare Quick Tunnels
publish only ports 3000, 3001 and 3002 through random HTTPS
`*.trycloudflare.com` URLs. PostgreSQL and MinIO remain bound to loopback.

No Cloudflare account, domain, DNS record or payment is required. The URLs
exist only while the foreground command is running and change on every start.
Cloudflare documents Quick Tunnels as development/testing facilities with a
200 concurrent-request limit and no Server-Sent Events support.

## Acceptance criteria

1. The repository-pinned Node.js 24.18.0 and Pnpm 11.18.0 are used and Docker
   Desktop is reachable before any service is reported ready.
2. The official `cloudflare/cloudflared:2026.7.3` image is locked to registry
   digest `sha256:e39ee8da...d91bf`; no mutable image tag or host installation is
   executed.
3. Each browser application and the API receive a distinct random HTTPS Quick
   Tunnel URL. A user-level Cloudflare configuration cannot be consumed by the
   demo process.
4. Runtime credentials are generated with cryptographic randomness into the
   ignored `.env.quick-tunnel` file. An unrelated existing file is never
   overwritten.
5. PostgreSQL and MinIO bind only to dynamically selected loopback ports. The
   database is exactly `kele_e2e`, migrations apply, and the guarded seed
   installs only deterministic synthetic fixtures.
6. Payment, refund and SMS remain Fake providers, customer OTP is `111111`,
   storage is local MinIO, and administrator authorization remains the static
   development adapter with a random server-side credential.
7. Local readiness and the three public HTTPS endpoints pass before URLs are
   presented. A partial tunnel, failed build, failed migration or failed seed
   is never reported as ready.
8. `Ctrl+C` terminates the three tunnels and application processes and stops
   the dedicated Compose project without deleting its volumes.

## Failure cases and security boundary

- Ports 3000, 3001 or 3002 already in use stop startup with a clear error.
- An unavailable Docker Engine or failure to pull/inspect the pinned official
  image stops startup before any URL is presented.
- Quick Tunnel has no KELE authentication wall in front of the Storefront URL.
  The Administration URL carries application authorization but anyone holding
  that URL can exercise the synthetic development administrator experience.
- Do not enter real customer identities, mobile numbers, addresses, provider
  credentials, cards or production data. Share all three random URLs only with
  the intended testers.
- The API URL is public for contract and callback-flow testing. Rate limits and
  application guards remain active, but the URL is not a private network.
- This profile cannot close Vandar, Kavenegar, Arvan, monitoring, managed
  PostgreSQL/PITR, image-scan or production identity certification in ADR-0005.

## Prerequisites

- Docker Desktop is installed and running.
- The repository is checked out on the intended commit.
- Node.js reports `v24.18.0`; Corepack can run Pnpm 11.18.0.
- Dependencies are installed once with `corepack pnpm@11.18.0 install
--frozen-lockfile`.
- Outbound HTTPS access to Docker Hub and Cloudflare is available.

The workflow runs its digest-pinned `cloudflared` image; do not install a
system service and do not run `cloudflared tunnel login`.

## Start and use

From the repository root in PowerShell:

```text
corepack pnpm@11.18.0 install --frozen-lockfile
corepack pnpm@11.18.0 demo:quick-tunnel:start
```

The first run pulls one official `cloudflared` image, starts PostgreSQL/MinIO,
applies migrations, resets the guarded synthetic fixture, builds all three
applications, and performs local plus public readiness. Wait for the final
`KELE Quick Tunnel demo is ready` block.

Open the printed Storefront and Administration URLs. Use synthetic Iranian
mobile numbers and customer OTP `111111`. The API readiness URL can be opened
independently. Keep the PowerShell window open for the entire test session.

Useful commands in another PowerShell window:

```text
corepack pnpm@11.18.0 demo:quick-tunnel:urls
docker compose --project-name kele-quick-tunnel --env-file .env.quick-tunnel -f docker-compose.quick-tunnel.yml ps
Get-Content .data/quick-tunnel/api.log -Wait
Get-Content .data/quick-tunnel/storefront.log -Wait
Get-Content .data/quick-tunnel/admin.log -Wait
```

Press `Ctrl+C` in the original window to invalidate the public URLs and stop
applications plus local infrastructure. Docker volumes and the random local
credentials are retained so later starts can reuse the isolated database.

## Verify or destroy

The following command performs the complete setup and public smoke test, then
automatically closes the URLs and services:

```text
corepack pnpm@11.18.0 demo:quick-tunnel:verify
```

After stopping the foreground session, delete the disposable database, object
storage, generated credentials and logs with:

```text
corepack pnpm@11.18.0 demo:quick-tunnel:reset
```

Reset is intentionally restricted to the dedicated `kele-quick-tunnel`
Compose project and the exact `kele_e2e` demo profile.

## Regional connectivity troubleshooting

Tunnel creation requires an HTTPS response from `api.trycloudflare.com`. If
startup reports `context deadline exceeded while awaiting headers`, the
applications are not published and the script closes every partial container.
This is a network-route failure, not a Cloudflare billing or account error.

1. Check the official Cloudflare status page and confirm Tunnel is operational.
2. Connect the workstation to a network that can reach Cloudflare, such as a
   trusted VPN or a different/mobile connection.
3. When using Docker Desktop, connect the alternate network first and restart
   Docker Desktop so its Linux VM inherits the new route.
4. Run `corepack pnpm@11.18.0 demo:quick-tunnel:verify`. A pass proves all three
   public endpoints and removes them automatically.
5. Then run `corepack pnpm@11.18.0 demo:quick-tunnel:start` for the actual test
   session.

Do not bypass TLS verification, download executables from unofficial mirrors,
or treat a printed `api.trycloudflare.com` service endpoint as the assigned
random tunnel URL. The orchestrator rejects that reserved API hostname and
accepts only a distinct `*.trycloudflare.com` origin; otherwise it fails closed.
