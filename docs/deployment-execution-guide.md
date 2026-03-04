# Deployment Execution Guide (Step-by-Step)

This guide walks through everything you need to configure to use the scaffolded deployment stack:

- Terraform (DigitalOcean droplet/firewall/reserved IP)
- Docker Hub image pipeline
- GitHub Actions workflows
- Cloudflare DNS + TLS with Traefik
- Server runtime `.env`

Important distinction:

- Terraform/`doctl` use **DigitalOcean API token** (no SSH needed).
- Deploy workflow uses **SSH key** to run compose commands on the droplet.

Use this with:

- [deployment-preflight-manual-checklist.md](/Users/nickririnui/Desktop/RLFantasyTracker/docs/deployment-preflight-manual-checklist.md)
- [deployment-digitalocean-docker-terraform.md](/Users/nickririnui/Desktop/RLFantasyTracker/docs/deployment-digitalocean-docker-terraform.md)
- [deployment-post-terraform-go-live.md](/Users/nickririnui/Desktop/RLFantasyTracker/docs/deployment-post-terraform-go-live.md)

---

## 1) Confirm Scaffolded Files

Already scaffolded in repo:

- Dockerfiles:
  - `deploy/docker/api.Dockerfile`
  - `deploy/docker/web.Dockerfile`
- Runtime:
  - `deploy/compose/compose.prod.yml`
  - `deploy/compose/.env.example`
  - `deploy/traefik/dynamic.yml`
- Terraform:
  - `infra/terraform/envs/prod/*`
  - `infra/terraform/modules/droplet_stack/*`
- GitHub workflows:
  - `.github/workflows/ci.yml`
  - `.github/workflows/docker-release.yml`
  - `.github/workflows/deploy-prod.yml`
  - `.github/workflows/infra-plan.yml`
  - `.github/workflows/infra-apply.yml`

---

## 2) Create Terraform Production Vars

```bash
cd infra/terraform/envs/prod
cp terraform.tfvars.example terraform.tfvars
```

Edit `terraform.tfvars`:

- `region` (example: `syd1`)
- `droplet_size` (second-smallest plan)
- `ssh_key_fingerprints` (your DO SSH key fingerprint(s))
- `admin_cidrs` (your static IP `/32`)
- Keep `enable_cloudflare_origin_lock = true`
- Keep Cloudflare CIDRs current

Important:

- `*.tfvars` is gitignored; do not commit.

---

## 3) Apply Terraform

```bash
cd infra/terraform/envs/prod
export TF_VAR_do_token='<DIGITALOCEAN_TOKEN>'
terraform init
terraform plan
terraform apply
terraform output
```

Capture:

- `public_ip` (use for DNS)
- `droplet_id`

---

## 4) Configure Cloudflare DNS

In Cloudflare DNS:

- Create proxied `A` record:
  - `@` -> `<public_ip>`
- Create proxied `A` record:
  - `api` -> `<public_ip>`

For your setup this should resolve to:

- `footybreakevens.com` -> `<public_ip>`
- `api.footybreakevens.com` -> `<public_ip>`

Then in Cloudflare SSL/TLS:

- Set mode to `Full (strict)`.

---

## 5) Bootstrap Server Once

SSH to droplet and set up runtime directory:

```bash
ssh root@<public_ip>
mkdir -p /opt/rlfantasy
```

Create deploy user (recommended) and switch later:

```bash
adduser deploy
usermod -aG sudo deploy
mkdir -p /home/deploy/.ssh
chmod 700 /home/deploy/.ssh
# add authorized_keys, then:
chown -R deploy:deploy /home/deploy/.ssh
```

Install Docker + Compose v2 if not already present (Ubuntu 24.04 package: `docker-compose-v2`).

---

## 6) Create Runtime Env File on Server

On droplet:

```bash
mkdir -p /opt/rlfantasy
cp /opt/rlfantasy/deploy/compose/.env.example /opt/rlfantasy/.env 2>/dev/null || true
nano /opt/rlfantasy/.env
chmod 600 /opt/rlfantasy/.env
```

Required keys in `/opt/rlfantasy/.env`:

- `APP_DOMAIN`
- `API_DOMAIN`
- `TRAEFIK_ACME_EMAIL`
- `CF_DNS_API_TOKEN`
- `DATABASE_URL` (remote DB, SSL required)
- `JWT_ACCESS_SECRET`
- `JWT_REFRESH_SECRET`
- `API_IMAGE`
- `WEB_IMAGE`

Notes:

- Set:
  - `APP_DOMAIN=footybreakevens.com`
  - `API_DOMAIN=api.footybreakevens.com`
- `API_IMAGE` and `WEB_IMAGE` are overwritten by deploy workflow with selected `image_tag`.
- Keep only real secrets in server `.env`; never commit.

---

## 7) Configure GitHub Environment + Secrets

In GitHub repo settings:

1. Create environment: `production`
2. Add required reviewers for that environment
3. Add secrets (prefer environment-scoped):

- `DOCKERHUB_USERNAME`
- `DOCKERHUB_TOKEN`
- `DIGITALOCEAN_TOKEN`
- `DROPLET_HOST`
- `DROPLET_USER` (e.g. `deploy`)
- `DROPLET_SSH_PRIVATE_KEY`

Optional:

- `CLOUDFLARE_API_TOKEN` (if used by infra workflow extensions)

---

## 8) Build and Push Images

Run workflow:

- `Docker Release` (`.github/workflows/docker-release.yml`)

This publishes:

- `docker.io/<DOCKERHUB_USERNAME>/rlfantasy-api:sha-<commit>`
- `docker.io/<DOCKERHUB_USERNAME>/rlfantasy-web:sha-<commit>`

---

## 9) Deploy to Production

Run workflow:

- `Deploy Production` (`.github/workflows/deploy-prod.yml`)

Input:

- `image_tag` = `sha-<commit>`

What it does:

1. copies `deploy/` assets to `/opt/rlfantasy`
2. logs into Docker Hub on droplet
3. sets `API_IMAGE` / `WEB_IMAGE` for selected tag
4. runs `docker compose up -d`
5. checks web and API health through Traefik host routing

---

## 10) Verify Deployment

From your machine:

```bash
curl -I https://<APP_DOMAIN>
curl -I https://<API_DOMAIN>/health
```

On server:

```bash
cd /opt/rlfantasy
docker compose -f deploy/compose/compose.prod.yml --env-file /opt/rlfantasy/.env ps
docker compose -f deploy/compose/compose.prod.yml --env-file /opt/rlfantasy/.env logs --tail=100 api
docker compose -f deploy/compose/compose.prod.yml --env-file /opt/rlfantasy/.env logs --tail=100 worker
```

Confirm:

- certificates issued
- API healthy
- scheduler running only in worker

---

## 11) Rollback

Re-run `Deploy Production` with an older known-good tag:

- `image_tag = sha-<previous_commit>`

No code changes required for rollback if prior images exist in Docker Hub.

---

## 12) Ongoing Ops

- Keep Cloudflare IP ranges in Terraform vars current.
- Rotate Docker Hub token, DO token, JWT secrets periodically.
- Keep `production` environment approvals enabled.
- Test remote DB PITR/restore process periodically.

---

## 13) Common Pitfalls

1. `502/404` at domain after deploy
   - Check DNS points to droplet `public_ip`.
   - Check `APP_DOMAIN` / `API_DOMAIN` in `/opt/rlfantasy/.env`.
2. No TLS cert issued
   - Check `CF_DNS_API_TOKEN` validity and zone permissions.
3. Deploy succeeds but old code running
   - Ensure `image_tag` matches pushed SHA tag.
4. Duplicate scheduler execution
   - Ensure API has `ENABLE_SCHEDULER=false`.
   - Worker runs `dist/worker/run-scheduler.js`.
