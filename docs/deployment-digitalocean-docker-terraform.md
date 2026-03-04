# Production Deployment Runbook (DigitalOcean + Docker + Terraform + Traefik)

## 1) Objective

Deploy this app to a DigitalOcean Droplet using:

- Docker + Docker Compose for runtime
- Terraform for infrastructure provisioning
- Docker Hub as image registry
- GitHub Actions for CI/CD
- Traefik + Let's Encrypt for TLS
- Cloudflare-managed domain for public routing

This runbook is security-first and assumes a **single production Droplet** (your requested second-smallest size tier).

---

## 2) Architecture Decision (API vs Worker)

### Recommended production topology

Run **4 containers** on the droplet:

1. `traefik` (edge proxy + TLS)
2. `web` (Next.js client)
3. `api` (Express API)
4. `worker` (scheduler/background sync process)

### Why separate `worker` from `api`

In the current codebase, scheduler startup is called from API startup (`startScheduler()` in `app/api/src/index.ts`).

If you ever run >1 API instance, scheduler jobs duplicate. A dedicated worker avoids:

- duplicate sync runs
- noisy logs
- accidental API-coupled job outages

### Required small refactor before go-live

Add one of these patterns:

- `ENABLE_SCHEDULER=false` in API container and `true` in worker container, or
- separate worker entrypoint (`src/worker/run-scheduler.ts`) and run that in worker service.

---

## 3) High-Level Flow

1. Terraform creates droplet + firewall + reserved IP + project/tagging.
2. Cloudflare DNS points `A` records to reserved IP (proxied).
3. GitHub Actions builds/pushes Docker images to Docker Hub.
4. Deploy workflow SSHs to droplet and runs `docker compose up -d`.
5. Traefik terminates TLS via Let's Encrypt DNS challenge (Cloudflare token).
6. API + web + worker run on private Docker network behind Traefik.

---

## 4) Prerequisites and Accounts

You need:

- DigitalOcean account + PAT token
- Docker Hub account + access token
- Cloudflare zone for your domain
- GitHub repo (with Actions enabled)
- SSH key pair dedicated for deployment

---

## 5) Infrastructure as Code (Terraform) Scaffold

Create:

```text
infra/
  terraform/
    modules/
      droplet_stack/
        main.tf
        variables.tf
        outputs.tf
    envs/
      prod/
        versions.tf
        providers.tf
        variables.tf
        main.tf
        outputs.tf
        terraform.tfvars.example
```

### `versions.tf` (prod)

- Pin Terraform and provider versions.
- Use `digitalocean/digitalocean` provider.

### Terraform resources to include

- `digitalocean_project`
- `digitalocean_tag`
- `digitalocean_droplet`
- `digitalocean_firewall`
- `digitalocean_reserved_ip` (recommended stable public IP)

Optional:

- `digitalocean_monitor_alert`
- `digitalocean_volume` (if you want persistent local storage beyond droplet disk)

### Droplet sizing

Use second-smallest tier in chosen region (example commonly `s-1vcpu-2gb`; verify current catalog when applying).

### Firewall policy (minimum)

Inbound:

- `22/tcp` from your trusted admin IP(s) only
- `80/tcp` from all (or Cloudflare ranges if you enforce strict origin)
- `443/tcp` from all (or Cloudflare ranges if you enforce strict origin)

Outbound:

- allow all (or restricted egress if your ops model supports it)

---

## 6) Runtime Container Layout (Compose)

Create a dedicated production compose file on server, e.g. `/opt/rlfantasy/compose.prod.yml`.

Services:

- `traefik`
- `web`
- `api`
- `worker`

Key principles:

- only Traefik exposes host ports `80`/`443`
- web/api/worker run on internal Docker network
- `api` and `worker` use remote DB URL from host `.env`
- worker has scheduler enabled, API has scheduler disabled
- Traefik ACME storage (`acme.json`) persisted and permission-locked

---

## 7) Traefik + Let's Encrypt + Cloudflare

### Certificate strategy

Use ACME DNS challenge with Cloudflare token.

Benefits:

- works behind Cloudflare proxy
- supports wildcard certs
- avoids HTTP challenge edge cases

### Traefik security settings

- Disable insecure dashboard
- If dashboard is enabled, bind to localhost or protect with auth + IP allowlist
- Add security headers middleware (HSTS, X-Frame-Options, etc.)
- Persist ACME store and prevent world-readable perms

### Cloudflare token scope

Minimum for DNS challenge:

- Zone DNS Edit on only the production zone

Use token TTL/IP restriction if possible.

### Cloudflare SSL mode

Set SSL/TLS mode to **Full (strict)**.

---

## 8) Domain and Routing

Example records (proxied):

- `footybreakevens.com` -> reserved IP (A record)
- `api.footybreakevens.com` -> reserved IP (A record)

Traefik routes by host rules:

- `footybreakevens.com` -> `web`
- `api.footybreakevens.com` -> `api`

---

## 9) Server Bootstrap (first SSH session)

On first provision:

1. Create non-root deploy user.
2. Install Docker Engine + Compose plugin.
3. Lock down SSH:
   - disable password auth
   - disable root login
4. Enable firewall (UFW) aligned with DO firewall.
5. Enable unattended security upgrades.
6. Create app dirs:
   - `/opt/rlfantasy`
   - `/opt/rlfantasy/traefik`
   - `/opt/rlfantasy/data`
7. Write runtime `.env` on server (not in repo).

---

## 10) Runtime Environment Variables (set on instance)

Store in `/opt/rlfantasy/.env` with strict perms (`600`).

Typical variables:

- `NODE_ENV=production`
- `PORT=5000` (api internal)
- `NEXT_PUBLIC_API_URL=https://api.footybreakevens.com`
- `DATABASE_URL=...` (remote DB)
- `JWT_ACCESS_SECRET=...`
- `JWT_REFRESH_SECRET=...`
- `FOOTY_STATS_COOKIE=...` (if required)
- `FOOTY_STATS_XSRF_TOKEN=...` (if required)
- `TRAEFIK_ACME_EMAIL=ops@footybreakevens.com`
- `CF_DNS_API_TOKEN=...`
- `ENABLE_SCHEDULER_API=false`
- `ENABLE_SCHEDULER_WORKER=true`

Do not commit this file.

---

## 11) Docker Hub and Image Strategy

Publish two app images at minimum:

- `yourorg/rlfantasy-api`
- `yourorg/rlfantasy-web`

Tagging:

- immutable SHA tag (required): `:sha-<gitsha>`
- optional moving tag: `:latest`

Deploy from image **digest** for deterministic and tamper-resistant rollbacks.
Use SHA tags for discoverability, then resolve to digest in deploy step.

---

## 12) GitHub Actions Pipeline Design

Create workflows:

1. `ci.yml`
   - lint + typecheck + tests
2. `docker-release.yml`
   - build and push images to Docker Hub on `main`
3. `deploy-prod.yml`
   - SSH deploy to droplet with approved environment
4. `infra-plan.yml` / `infra-apply.yml` (optional but recommended)
   - terraform validate/plan/apply with manual approvals

### Deployment sequence (deploy workflow)

1. pull new image digests/tags
2. write/update compose env values (or image tag file)
3. `docker compose -f compose.prod.yml up -d --remove-orphans`
4. run health checks:
   - `https://footybreakevens.com`
   - `https://api.footybreakevens.com/health` (or equivalent)
5. fail and rollback to previous SHA tag on unhealthy deploy

### GitHub environment protection

Use `production` environment with required reviewers before deploy job runs.

---

## 13) GitHub Secrets (minimum set)

Repository/Environment secrets:

- `DOCKERHUB_USERNAME`
- `DOCKERHUB_TOKEN`
- `DROPLET_HOST`
- `DROPLET_USER`
- `DROPLET_SSH_PRIVATE_KEY`
- `DIGITALOCEAN_TOKEN` (if Terraform in Actions)
- `TF_VAR_do_token` (alternative naming)

If Terraform also manages DNS (optional), add:

- `CLOUDFLARE_API_TOKEN`

Do not store runtime app secrets in repo. Keep runtime secrets on server `.env`.

---

## 14) Security Best Practices Checklist

Infrastructure:

- [ ] DO firewall enabled and least-privilege rules applied
- [ ] reserved IP used (stable origin address)
- [ ] SSH restricted to key auth only

Host:

- [ ] deploy user is non-root
- [ ] automatic security updates enabled
- [ ] fail2ban (or equivalent) enabled for SSH
- [ ] no unnecessary public ports except `80/443` and restricted `22`

Containers:

- [ ] pin image tags by SHA in production
- [ ] use read-only volumes where possible
- [ ] avoid privileged mode
- [ ] no secrets baked into images

TLS/Edge:

- [ ] Cloudflare SSL mode = Full (strict)
- [ ] Let's Encrypt ACME store persisted
- [ ] Traefik dashboard not publicly exposed

CI/CD:

- [ ] protected `production` environment with reviewer gate
- [ ] secrets scoped per-environment, not global unless necessary
- [ ] deploy pipeline uses immutable image tags

Operations:

- [ ] remote DB backup policy verified (provider-managed)
- [ ] DB point-in-time restore process verified
- [ ] runbook for rollback by previous SHA tag
- [ ] alerting for health and container restarts

---

## 14A) Mandatory Security Controls (Do Before Production)

1. Lock origin to Cloudflare
   - Restrict inbound `80/443` to Cloudflare IP ranges only.
   - Keep `22` restricted to trusted admin IPs only.
2. Disable scheduler in API container
   - Scheduler must run only in `worker` to prevent duplicate jobs.
3. Deploy by digest
   - Pin `image: repo@sha256:...` in production compose.
4. Harden containers
   - Non-root user, `no-new-privileges`, `cap_drop: [ALL]`, read-only FS where possible.
5. Protect GitHub deploy path
   - Use `production` environment approvals.
   - Set minimal workflow `permissions`.
6. Secret hygiene
   - Keep runtime secrets only on host `.env` (or secret manager), never in repo.
   - Rotate JWT/DB/API credentials on a schedule.
7. Remote DB recovery verification
   - Confirm provider backups/PITR are enabled.
   - Run one restore drill against the remote DB provider before go-live.

---

## 14B) Recommended Security Controls (Strongly Suggested)

1. Image vulnerability scanning (`trivy`) in CI, fail on `CRITICAL`.
2. Generate SBOMs and store as build artifacts.
3. Add rate limiting at Traefik/API layers and WAF rules in Cloudflare.
4. Enable host intrusion controls (`fail2ban`, audit logging).
5. Add alerting for:
   - container restart loops
   - repeated 5xx
   - certificate renewal failures
6. Move runtime secrets to managed store later (e.g. Doppler/1Password/Vault/SOPS).

---

## 14C) Security Snippets

### Docker Compose hardening example

```yaml
services:
  api:
    image: yourorg/rlfantasy-api@sha256:REPLACE_DIGEST
    user: "10001:10001"
    read_only: true
    security_opt:
      - no-new-privileges:true
    cap_drop:
      - ALL
    tmpfs:
      - /tmp:size=64m
    healthcheck:
      test: ["CMD", "wget", "-qO-", "http://127.0.0.1:5000/health"]
      interval: 30s
      timeout: 5s
      retries: 5
    restart: unless-stopped
```

### GitHub Actions minimal permissions example

```yaml
permissions:
  contents: read
  packages: write
  id-token: none
```

For deploy jobs, keep `contents: read` unless another scope is explicitly needed.

### Terraform firewall model (concept)

Allow:
- `22/tcp` only from admin CIDRs
- `80/tcp` and `443/tcp` only from Cloudflare CIDRs

Deny all other inbound.

If you do not enforce Cloudflare-only origin, at minimum add strict API rate limiting and bot protections.

### Traefik dashboard lockdown

- Do not expose dashboard publicly.
- If required, bind to localhost or protect by both:
  - IP allowlist
  - basic auth / forward auth

---

## 15) Rollback Procedure

1. Identify last known-good SHA image tags.
2. Update compose image tags to previous SHA.
3. Run `docker compose up -d`.
4. Verify health endpoints and core UI/API flows.
5. Open incident note with root cause + corrective action.

---

## 16) Implementation Order (recommended)

1. Refactor scheduler control (`api` vs `worker` responsibility).
2. Create Terraform scaffold and provision droplet/firewall/reserved IP.
3. Harden host and install Docker/Compose.
4. Create production compose + Traefik config on host.
5. Configure Cloudflare DNS + SSL mode.
6. Add CI + image publish + deploy workflows.
7. Run first manual deployment.
8. Enable protected production environment and enforce approvals.

---

## 17) References (primary docs)

- DigitalOcean Terraform provider reference:  
  https://docs.digitalocean.com/reference/terraform/reference/
- DigitalOcean droplet resource:  
  https://docs.digitalocean.com/reference/terraform/reference/resources/droplet/
- DigitalOcean firewall resource:  
  https://docs.digitalocean.com/reference/terraform/reference/resources/firewall/
- DigitalOcean reserved IP resource:  
  https://docs.digitalocean.com/reference/terraform/reference/resources/reserved_ip/
- Docker Compose plugin install (Linux):  
  https://docs.docker.com/compose/install/linux/
- Traefik ACME/Let's Encrypt docs:  
  https://doc.traefik.io/traefik/v3.3/https/acme/
- GitHub Actions secrets:  
  https://docs.github.com/actions/configuring-and-managing-workflows/creating-and-storing-encrypted-secrets
- GitHub environments and deployment protection:  
  https://docs.github.com/actions/reference/workflows-and-actions/deployments-and-environments
- Cloudflare Full (strict) SSL mode:  
  https://developers.cloudflare.com/ssl/origin-configuration/ssl-modes/full-strict/
- Cloudflare proxy status and proxied records:  
  https://developers.cloudflare.com/dns/proxy-status/
- Cloudflare API token creation:  
  https://developers.cloudflare.com/fundamentals/api/get-started/create-token/
