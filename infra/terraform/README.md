# Terraform Infrastructure Scaffold

## Target

DigitalOcean single-droplet production stack with:

- project
- droplet
- firewall
- reserved IP

## Structure

```text
infra/terraform/
  modules/droplet_stack
  envs/prod
```

## Quick Start (local)

```bash
cd infra/terraform/envs/prod
cp terraform.tfvars.example terraform.tfvars
# edit terraform.tfvars
export TF_VAR_do_token=your_do_token
terraform init
terraform plan
terraform apply
```

## Notes

- Keep `enable_cloudflare_origin_lock=true` for secure origin posture.
- Keep `terraform.tfvars` out of git (contains sensitive infra data).
