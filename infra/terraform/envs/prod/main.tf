module "droplet_stack" {
  source = "../../modules/droplet_stack"

  project_name                  = var.project_name
  environment                   = var.environment
  region                        = var.region
  droplet_name                  = var.droplet_name
  droplet_size                  = var.droplet_size
  droplet_image                 = var.droplet_image
  ssh_key_fingerprints          = var.ssh_key_fingerprints
  admin_cidrs                   = var.admin_cidrs
  enable_cloudflare_origin_lock = var.enable_cloudflare_origin_lock
  cloudflare_ipv4_cidrs         = var.cloudflare_ipv4_cidrs
  cloudflare_ipv6_cidrs         = var.cloudflare_ipv6_cidrs
  assign_reserved_ip            = var.assign_reserved_ip
  enable_monitoring             = var.enable_monitoring
  enable_droplet_backups        = var.enable_droplet_backups
  vpc_uuid                      = var.vpc_uuid
  extra_tags                    = var.extra_tags
  user_data                     = var.user_data
}
