# Deployment Scaffold

This directory contains production deployment scaffolding:

- `docker/` production Dockerfiles
- `compose/compose.prod.yml` production runtime stack (`traefik + web + api + worker + watchtower`)
- `traefik/dynamic.yml` security/compression middleware config

## How Deployment Works

1. Push to `master` triggers `docker-release.yml` in GitHub Actions
2. Docker Release builds and pushes `:latest` images to Docker Hub
3. **Watchtower** (running on the droplet) polls Docker Hub every 30s
4. When Watchtower detects a new image digest, it auto-pulls and restarts the container

No SSH, no `deploy-prod.yml`, no firewall juggling. Fully automated.

## Build images locally

```bash
docker build -f deploy/docker/api.Dockerfile -t rlfantasy-api:local .
docker build -f deploy/docker/web.Dockerfile -t rlfantasy-web:local .
```

## Run stack locally (production-like)

```bash
# Create .env with required variables (see compose.prod.yml for required vars)
docker compose -f deploy/compose/compose.prod.yml --env-file .env up -d
```

## Deployment `.env` variables

| Variable | Purpose |
|----------|---------|
| `APP_DOMAIN` | Frontend domain (e.g. `footybreakevens.com`) |
| `API_DOMAIN` | API domain (e.g. `api.footybreakevens.com`) |
| `TRAEFIK_ACME_EMAIL` | Email for Let's Encrypt certs |
| `CF_DNS_API_TOKEN` | Cloudflare DNS API token |
| `DATABASE_URL` | Postgres connection string |
| `JWT_ACCESS_SECRET` | JWT signing secret |
| `JWT_REFRESH_SECRET` | JWT refresh secret |
| `DOCKERHUB_USERNAME` | Docker Hub username (used in image tags) |
| `NRL_FANTASY_DATA_BASE_URL` | Optional override for upstream NRL data API (default `https://fantasy.nrl.com/data/nrl`) |

## Notes

- Watchtower only monitors containers with `com.centurylinklabs.watchtower.enable=true` label
- `api` has `ENABLE_SCHEDULER=false`; `worker` runs the scheduler process
- Images are pinned to `:latest` tag; Watchtower tracks digest changes
- `NEXT_PUBLIC_*` values for Next.js web are baked at image build time via GitHub Actions build args
- GA4 Measurement ID is set in `.github/workflows/docker-release.yml` and baked into the web image at build time
- `API_INTERNAL_BASE_URL` is runtime-only and used by Next.js server routes to call API over the Docker network (`http://api:5000`)
