# Hostiran initial deployment

Status: operator-runbook for the first self-hosted launch boundary

This profile deploys KELE on a single Hostiran VPS with Docker Compose. It uses
the same **synthetic UAT runtime** as the Liara demo: Fake Payment, Fake SMS,
private MinIO storage on the VPS, and OTP code `111111`.

It is **not** `KELE_DEPLOYMENT_TIER=production`. Commercial production remains
blocked until Vandar, Kavenegar and Arvan Object Storage are configured and
verified. Use this profile only for an initial low-traffic launch or internal
review.

## Requirements

| Item | Minimum |
|---|---|
| VPS | Hostiran VPS-3-IR or higher |
| OS | Ubuntu 22.04 LTS |
| Domain | DNS `A` record pointing to the VPS public IP |
| Ports | `22`, `80`, `443` open |

## Topology

```text
Internet
   │
   ▼
Caddy (:443, Let's Encrypt)
   │
   ▼
KELE synthetic UAT gateway (:3000)
   ├── Storefront /
   ├── Administration /admin
   └── API /api/v1
   │
   ▼
PostgreSQL 16 (private Docker network)
MinIO (private Docker network, admin media uploads)
```

Product and outfit imagery for the seeded catalog comes from tracked static
assets under `apps/storefront/public/media`. New administrator uploads are
stored in the private MinIO bucket and served through the Storefront `/media/uploads`
proxy.

## 1. Prepare the VPS

SSH into the server and install Docker:

```bash
sudo apt-get update
sudo apt-get install -y ca-certificates curl git unzip
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker "$USER"
```

Log out and back in so the Docker group applies.

Optional firewall:

```bash
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

## 2. Point DNS to the VPS

At your domain registrar create:

```text
A    @      ->  <VPS_PUBLIC_IP>
A    www    ->  <VPS_PUBLIC_IP>   (optional)
```

Wait until the domain resolves to the VPS before starting Caddy.

## 3. Upload the repository

On your workstation, from the repository root:

```text
pnpm deploy:hostiran:archive
scp kele-hostiran.zip user@<VPS_IP>:~/
```

On the VPS:

```bash
mkdir -p ~/kele && cd ~/kele
unzip ~/kele-hostiran.zip
```

Alternatively clone the reviewed Git branch if the VPS can reach the remote.

## 4. Generate environment variables

On your workstation (recommended) or on the VPS after installing Node 24:

```text
pnpm deploy:hostiran:env -- shop.example.com +989121234567 > deploy/hostiran/.env
```

Replace:

- `shop.example.com` with your real domain
- `+989121234567` with the synthetic administrator mobile for `/admin/login`

Copy `deploy/hostiran/.env` to the VPS if you generated it locally. Never commit
this file.

## 5. Build and start

On the VPS:

```bash
cd ~/kele/deploy/hostiran
docker compose up -d --build
docker compose logs -f kele
```

The first build can take 10–20 minutes on a VPS-3. Expect this log line:

```text
KELE synthetic UAT is ready on port 3000 for https://shop.example.com.
```

Caddy obtains a Let's Encrypt certificate automatically once DNS is correct.

## 6. Smoke test

Replace `shop.example.com` with your domain:

```text
https://shop.example.com/__kele/health/ready
https://shop.example.com/
https://shop.example.com/admin/login
https://shop.example.com/api/v1/health/ready
```

All four URLs must return HTTP `200`.

Sign-in checks:

| Role | Mobile | OTP |
|---|---|---|
| Customer | any synthetic `+98` test mobile | `111111` |
| Administrator | value of `KELE_UAT_ADMIN_MOBILE` | `111111` |

Checkout uses Fake Payment. Do not enter real customer, payment or address
data on a shared initial-deploy URL.

## 7. Routine operations

Restart after an env change:

```bash
cd ~/kele/deploy/hostiran
docker compose up -d --build
```

View logs:

```bash
docker compose logs -f
```

Stop:

```bash
docker compose down
```

Back up PostgreSQL:

```bash
docker compose exec -T postgres pg_dump -U kele kele > kele-backup.sql
```

## Upgrade path to commercial production

When payment, SMS and storage providers are ready:

1. Provision Vandar, Kavenegar and Arvan Object Storage.
2. Switch to `KELE_DEPLOYMENT_TIER=production` with the three release images in
   `Dockerfile.release`.
3. Run the one-shot migration job from the API image.
4. Replace Fake providers and placeholder storage configuration.
5. Complete staging smoke tests documented in `docs/deployment-runbook.md`.

Do not merely change env vars on this single-container profile and call it
production; the startup guards intentionally reject that shortcut.

## Troubleshooting

| Symptom | Check |
|---|---|
| Caddy certificate error | DNS not propagated; port 80 blocked |
| `502` from site | `docker compose logs kele` for upstream failure |
| `503` readiness | PostgreSQL health and migrations |
| Container OOM | Upgrade to VPS-4 or lower `KELE_*_HEAP_MB` values |
| Media upload fails | Confirm `minio` and `minio-init` are healthy; regenerate `.env` |
| MinIO pull denied on Docker Hub | Use `quay.io/minio/minio` in `deploy/hostiran/docker-compose.yml` |
| Build timeout | Retry build; ensure VPS has free disk (>15 GB) |

## Security notes

- Share the public URL only with trusted testers during initial launch.
- Rotate all generated secrets if `.env` is exposed.
- Replace Fake Payment/SMS before accepting real orders.
- Keep PostgreSQL off the public internet; this compose file does not publish
  port `5432`.
