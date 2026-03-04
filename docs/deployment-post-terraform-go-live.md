# Post-Terraform Go-Live Checklist

Use this after `terraform apply` succeeds.

For current infrastructure, Terraform output returned:

- `public_ip`: `170.64.251.61`
- `droplet_id`: `555919674`

If infrastructure is recreated later, always use the latest `terraform output public_ip`.

---

## 1) DNS (Cloudflare)

Create/confirm proxied (`orange cloud`) DNS records:

- `A @ ->   170.64.251.61`
- `A api -> 170.64.251.61`

Set Cloudflare SSL/TLS mode:

- `Full (strict)`

---

## 2) Bootstrap Droplet

SSH as root:

```bash
ssh -i ~/.ssh/footybreakevens_deploy root@170.64.251.61
```

Install Docker + Compose plugin:

```bash
apt-get update
apt-get install -y docker.io docker-compose-v2
systemctl enable docker
systemctl start docker
```

If your distro uses a different package name, install the equivalent Docker Compose v2 package and confirm:

```bash
docker compose version
```

Create app directory:

```bash
mkdir -p /opt/rlfantasy
```

Create deploy user:

```bash
adduser --disabled-password --gecos "" deploy
usermod -aG sudo,docker deploy
mkdir -p /home/deploy/.ssh
chmod 700 /home/deploy/.ssh
cp /root/.ssh/authorized_keys /home/deploy/.ssh/authorized_keys
chmod 600 /home/deploy/.ssh/authorized_keys
chown -R deploy:deploy /home/deploy/.ssh
```

Validate deploy SSH login from local machine:

```bash
ssh -i ~/.ssh/footybreakevens_deploy deploy@170.64.251.61
```

---

## 3) Create Runtime Env On Droplet

Create `/opt/rlfantasy/.env`:

```bash
sudo mkdir -p /opt/rlfantasy
sudo tee /opt/rlfantasy/.env >/dev/null <<'EOF'
APP_DOMAIN=footybreakevens.com
API_DOMAIN=api.footybreakevens.com
TRAEFIK_ACME_EMAIL=ops@footybreakevens.com
CF_DNS_API_TOKEN=

DATABASE_URL=
JWT_ACCESS_SECRET=
JWT_REFRESH_SECRET=
JWT_ACCESS_EXPIRATION=1h
JWT_REFRESH_EXPIRATION=7d

# Fallback image values (workflow overrides with selected tag)
API_IMAGE=docker.io/<dockerhub-username>/rlfantasy-api:latest
WEB_IMAGE=docker.io/<dockerhub-username>/rlfantasy-web:latest

# Optional upstream cookie auth
FOOTY_STATS_COOKIE=
FOOTY_STATS_XSRF_TOKEN=
FOOTY_STATS_USER_AGENT=
EOF
sudo chmod 600 /opt/rlfantasy/.env
sudo chown deploy:deploy /opt/rlfantasy/.env
```

Fill all required secrets first.

---

## 4) Runtime `.env` Go/No-Go Gate

Run this on droplet before first deploy:

```bash
set -euo pipefail
ENV_FILE=/opt/rlfantasy/.env
for key in APP_DOMAIN API_DOMAIN TRAEFIK_ACME_EMAIL CF_DNS_API_TOKEN DATABASE_URL JWT_ACCESS_SECRET JWT_REFRESH_SECRET API_IMAGE WEB_IMAGE; do
  if ! grep -q "^${key}=" "$ENV_FILE"; then
    echo "Missing key: $key"
    exit 1
  fi
  value="$(grep "^${key}=" "$ENV_FILE" | cut -d'=' -f2-)"
  if [ -z "$value" ]; then
    echo "Empty value: $key"
    exit 1
  fi
done
echo "PASS: required .env keys exist and are non-empty"
```

Expected result:

- `PASS: required .env keys exist and are non-empty`

---

## 5) GitHub Secrets (Production Environment)

Create production environment (safe to run even if it already exists):

```bash
gh api --method PUT repos/nineteen17/RLFantasyTracker/environments/production
```

Set secrets from local machine in repo root:

```bash
gh secret set -R nineteen17/RLFantasyTracker -e production DROPLET_HOST -b"170.64.251.61"
gh secret set -R nineteen17/RLFantasyTracker -e production DROPLET_USER -b"deploy"
gh secret set -R nineteen17/RLFantasyTracker -e production DROPLET_SSH_PRIVATE_KEY < ~/.ssh/footybreakevens_deploy
gh secret set -R nineteen17/RLFantasyTracker -e production DOCKERHUB_USERNAME -b"<dockerhub-username>"
gh secret set -R nineteen17/RLFantasyTracker -e production DOCKERHUB_TOKEN -b"<dockerhub-token>"
```

Optional (only if running Terraform from GitHub Actions):

```bash
gh secret set -R nineteen17/RLFantasyTracker -e production DIGITALOCEAN_TOKEN -b"<digitalocean-token>"
```

---

## 6) Deploy Sequence

Run from your local machine:

```bash
# 1) Push current code to master
cd /Users/nickririnui/Desktop/RLFantasyTracker
git add .
git commit -m "chore: deployment updates" || true
git push origin master

# 2) Find latest Docker Release run ID
gh run list -R nineteen17/RLFantasyTracker --workflow "Docker Release" --limit 1

# 3) Wait for Docker Release to finish
gh run watch <DOCKER_RELEASE_RUN_ID> -R nineteen17/RLFantasyTracker

# 4) Deploy Production auto-starts after successful Docker Release on master
#    Find latest deploy run ID
gh run list -R nineteen17/RLFantasyTracker --workflow "Deploy Production" --limit 1

# 5) Wait for deploy to finish
gh run watch <DEPLOY_RUN_ID> -R nineteen17/RLFantasyTracker
```

Manual override (rollback/hotfix):

```bash
gh workflow run "Deploy Production" -R nineteen17/RLFantasyTracker -f image_tag="sha-<commit_sha>"
```

If build and deploy runs are successful, continue to verification.

---

## 7) Verification

From local machine:

```bash
curl -I https://footybreakevens.com
curl -I https://api.footybreakevens.com/health
```

On droplet:

```bash
cd /opt/rlfantasy
docker compose -f deploy/compose/compose.prod.yml --env-file /opt/rlfantasy/.env ps
docker compose -f deploy/compose/compose.prod.yml --env-file /opt/rlfantasy/.env logs --tail=120 api
docker compose -f deploy/compose/compose.prod.yml --env-file /opt/rlfantasy/.env logs --tail=120 worker
```

Go/no-go:

- Web endpoint returns `200/301/302`
- API `/health` returns `200`
- `api`, `worker`, `web`, and `traefik` are `Up`

---

## 8) Rollback

If deploy is unhealthy:

1. Re-run `Deploy Production`
2. Use previous known-good `image_tag` (for example older `sha-...`)
3. Re-verify both endpoints and container health

---

## 9) Secret Safety Rules

- Never commit `.env` files with real values.
- Never paste real tokens/cookies into docs or source.
- Keep deploy private key only in:
  - local `~/.ssh/footybreakevens_deploy`
  - GitHub environment secret `DROPLET_SSH_PRIVATE_KEY`
