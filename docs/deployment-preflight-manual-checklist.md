# Deployment Preflight (Exact Steps)

Run these in order before we execute Terraform or production deploy workflows.

After Terraform has already been applied, continue with:

- [deployment-post-terraform-go-live.md](/Users/nickririnui/Desktop/RLFantasyTracker/docs/deployment-post-terraform-go-live.md)

---

## What Uses API vs SSH (Important)

- **DigitalOcean API token** is used by:
  - `doctl`
  - Terraform (`digitalocean` provider)
- **SSH key** is used by:
  - GitHub deploy workflow connecting to droplet
  - optional manual troubleshooting on droplet

So yes, Terraform provisioning does **not** require SSH.

---

## Step 1) Verify Local Tooling

```bash
docker --version
docker compose version
terraform version
doctl version
gh --version
```

Pass condition:

- all commands return versions without errors

---

## Step 2) Create Dedicated Deploy SSH Key

Create a project-only key (non-default path):

```bash
ssh-keygen -t ed25519 -C "deploy@footybreakevens" -f ~/.ssh/footybreakevens_deploy
```

If prompted for passphrase:

- for GitHub Actions usage, leave blank (press Enter twice)

Validate:

```bash
ls -l ~/.ssh/footybreakevens_deploy*
ssh-keygen -lf ~/.ssh/footybreakevens_deploy.pub
```

Artifacts from this step:

- public key: `~/.ssh/footybreakevens_deploy.pub`
- private key: `~/.ssh/footybreakevens_deploy`

---

## Step 3) Log In to DigitalOcean CLI

```bash
doctl auth init
doctl account get
```

Then import deploy public key to DO (if not already imported):

```bash
doctl compute ssh-key import footybreakevens-deploy --public-key-file ~/.ssh/footybreakevens_deploy.pub
doctl compute ssh-key list
```

Artifact from this step:

- SSH key fingerprint (needed in Terraform `terraform.tfvars`)

---

## Step 4) Capture Your Admin IP for Firewall

```bash
curl -4 ifconfig.me
```

Artifact from this step:

- admin CIDR in `/32` format (example `203.0.113.10/32`)

---

## Step 5) Confirm Docker Hub Access

Create Docker Hub access token, then:

```bash
docker login
docker info | rg -n "Username|Registry"
```

Artifacts from this step:

- Docker Hub username
- Docker Hub token

---

## Step 6) Confirm GitHub Access + Production Environment

```bash
gh auth login
gh auth status
```

In GitHub repo settings:

- create environment `production`
- require reviewers for `production`
- ensure Actions are enabled

---

## Step 7) Prepare Cloudflare

In Cloudflare dashboard:

- zone active for `footybreakevens.com`
- create API token with minimum scope:
  - Zone DNS Edit (zone-scoped to `footybreakevens.com`)
- plan SSL mode: `Full (strict)`

Domain targets:

- `footybreakevens.com`
- `api.footybreakevens.com`

Artifact from this step:

- Cloudflare DNS API token

---

## Step 8) Prepare Terraform Vars File

```bash
cd infra/terraform/envs/prod
cp terraform.tfvars.example terraform.tfvars
```

Fill at minimum:

- `region` (example `syd1`)
- `droplet_size` (second-smallest available in region)
- `ssh_key_fingerprints` (from Step 3)
- `admin_cidrs` (from Step 4)
- `enable_cloudflare_origin_lock = true`

Do not commit `terraform.tfvars`.

---

## Step 9) Prepare Runtime Secret Inventory

Have these values ready (not in git):

- `DATABASE_URL` (remote DB, with SSL)
- `JWT_ACCESS_SECRET`
- `JWT_REFRESH_SECRET`
- `CF_DNS_API_TOKEN`
- optional:
  - `FOOTY_STATS_COOKIE`
  - `FOOTY_STATS_XSRF_TOKEN`
  - `FOOTY_STATS_USER_AGENT`

---

## Step 10) Add GitHub Secrets (Repo + Production Environment)

Add these as repository secrets (used by `Docker Release` workflow):

- `DOCKERHUB_USERNAME`
- `DOCKERHUB_TOKEN`

Add these in GitHub `production` environment secrets (used by `Deploy Production` workflow):

- `DROPLET_USER` (usually `deploy`)
- `DROPLET_SSH_PRIVATE_KEY` (contents of `~/.ssh/footybreakevens_deploy`)
- `DOCKERHUB_USERNAME`
- `DOCKERHUB_TOKEN`
- `DIGITALOCEAN_TOKEN` (optional; only for Terraform workflows in GitHub)

Add after Terraform apply:

- `DROPLET_HOST` (public IP output)

Optional:

- `CLOUDFLARE_API_TOKEN` (only if needed by future Terraform/Action usage)

Validation after adding secrets:

- [ ] `docker-release` workflow can authenticate Docker Hub
- [ ] `infra-plan` can read `DIGITALOCEAN_TOKEN`
- [ ] `deploy-prod` has droplet host/user/private key set

---

## Step 10A) SSH Requirements (Only If Using SSH Deploy)

You need this because current deploy workflow runs remote `docker compose` over SSH.

1. Ensure droplet has deploy user + authorized key:
```bash
ssh root@<public_ip>
adduser deploy
usermod -aG sudo deploy
mkdir -p /home/deploy/.ssh
chmod 700 /home/deploy/.ssh
cat >> /home/deploy/.ssh/authorized_keys
# paste ~/.ssh/footybreakevens_deploy.pub then Ctrl+D
chmod 600 /home/deploy/.ssh/authorized_keys
chown -R deploy:deploy /home/deploy/.ssh
```

2. Test key login from local machine:
```bash
ssh -i ~/.ssh/footybreakevens_deploy deploy@<public_ip>
```

3. Put private key content into GitHub secret:
- `DROPLET_SSH_PRIVATE_KEY`

If this test fails, deploy workflow will fail.

---

## Step 11) Final Go/No-Go Gate

Proceed only when all are true:

- [ ] deploy SSH key created and tested
- [ ] DO key imported and fingerprint captured
- [ ] admin CIDR captured
- [ ] Docker Hub token ready
- [ ] GitHub `production` environment configured
- [ ] Cloudflare token ready and domain confirmed
- [ ] `terraform.tfvars` completed locally
- [ ] runtime secrets inventory prepared
- [ ] GitHub secrets added (except `DROPLET_HOST`, which is post-apply)

---

## Secret Placement Map

- `terraform.tfvars`:
  - infra config only (no JWT/API auth secrets)
- GitHub `production` secrets:
  - CI/CD auth + deploy SSH key + DO token
- Server `/opt/rlfantasy/.env`:
  - runtime app secrets and domain/env config

Never store real secrets in docs, tracked `.env`, or committed files.
