# Production Deployment Runbook (DigitalOcean + Docker + Watchtower)

## Architecture

Single DigitalOcean droplet running **5 containers**:

1. `traefik` — edge proxy + TLS (Let's Encrypt via Cloudflare DNS challenge)
2. `api` — Express API (`ENABLE_SCHEDULER=false`)
3. `worker` — background scheduler (`run-scheduler.ts`)
4. `web` — Next.js frontend
5. `watchtower` — auto-pulls new Docker images from Docker Hub

## Deployment Pipeline

```
push to master → Docker Release (GH Actions) → Docker Hub (:latest) → Watchtower auto-pull → container restart
```

- **No SSH** needed from CI
- **No `deploy-prod.yml`** workflow
- **No firewall management** during deploys
- Watchtower polls Docker Hub every 30 seconds

---

## Infrastructure

### DigitalOcean Resources

| Resource | Purpose |
|----------|---------|
| Droplet | Runs all containers |
| Reserved IP | Stable public IP for DNS |
| Cloud Firewall | Restricts SSH to admin IPs, allows 80/443 |

### Terraform

Infrastructure is managed in `infra/terraform/`. See [Terraform README](../infra/terraform/README.md).

### Cloudflare DNS

- `footybreakevens.com` → reserved IP (A record, proxied)
- `api.footybreakevens.com` → reserved IP (A record, proxied)
- SSL/TLS mode: **Full (strict)**

---

## GitHub Actions Workflows

| Workflow | Trigger | Purpose |
|----------|---------|---------|
| `docker-release.yml` | Push to `master` | Build + push `:latest` and `:sha-xxx` images to Docker Hub |
| `infra-plan.yml` | PR | Terraform plan (optional) |
| `infra-apply.yml` | Manual | Terraform apply (optional) |

### GitHub Secrets Required

**Repository-level** (used by Docker Release):
- `DOCKERHUB_USERNAME`
- `DOCKERHUB_TOKEN`

**Optional** (Terraform workflows):
- `DIGITALOCEAN_TOKEN`

---

## Server Setup (One-Time)

### 1. Install Docker

```bash
ssh root@<droplet_ip>
curl -fsSL https://get.docker.com | sh
```

### 2. Copy deploy assets

```bash
scp -r deploy root@<droplet_ip>:/opt/rlfantasy/
```

### 3. Create `.env`

```bash
nano /opt/rlfantasy/.env
chmod 600 /opt/rlfantasy/.env
```

Required variables:

| Variable | Example |
|----------|---------|
| `APP_DOMAIN` | `footybreakevens.com` |
| `API_DOMAIN` | `api.footybreakevens.com` |
| `TRAEFIK_ACME_EMAIL` | `you@example.com` |
| `CF_DNS_API_TOKEN` | Cloudflare DNS token |
| `DATABASE_URL` | `postgresql://...` |
| `JWT_ACCESS_SECRET` | Random 64-char hex |
| `JWT_REFRESH_SECRET` | Random 64-char hex |
| `DOCKERHUB_USERNAME` | Docker Hub username |

### 4. Start the stack

```bash
cd /opt/rlfantasy
docker compose -f deploy/compose/compose.prod.yml --env-file .env up -d
```

### 5. Verify

```bash
docker ps  # all 5 containers should be healthy/running
curl -I https://footybreakevens.com
curl -I https://api.footybreakevens.com/health
```

---

## Deploying New Code

Just push to `master`. That's it.

1. `docker-release.yml` builds and pushes new `:latest` images
2. Watchtower detects the new digest within ~30 seconds
3. Containers are recreated with the new image automatically

---

## Rollback

1. Find a previous known-good image SHA tag on Docker Hub
2. SSH into droplet
3. Manually pull and tag: `docker pull <image>:sha-<commit> && docker tag <image>:sha-<commit> <image>:latest`
4. Watchtower will detect the digest change and restart

Or set the image directly in compose and run `docker compose up -d`.

---

## Monitoring

### Watchtower logs

```bash
docker logs rlfantasy-watchtower --tail 50
```

### Container health

```bash
docker ps --format 'table {{.Names}}\t{{.Status}}'
```

---

## Security Checklist

- [x] DO firewall: SSH restricted to admin IPs only
- [x] DO firewall: 80/443 open (Cloudflare-proxied)
- [x] Cloudflare SSL mode: Full (strict)
- [x] Containers: non-root user, read-only FS, `no-new-privileges`, `cap_drop: ALL`
- [x] Traefik dashboard disabled
- [x] Runtime secrets in server `.env` only (never in repo)
- [x] Docker Hub images scanned with Trivy in CI
