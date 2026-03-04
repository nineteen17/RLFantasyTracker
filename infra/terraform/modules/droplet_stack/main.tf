locals {
  base_tags = compact(concat(
    ["rlfantasy", var.environment],
    var.extra_tags,
  ))

  web_sources = var.enable_cloudflare_origin_lock ? concat(var.cloudflare_ipv4_cidrs, var.cloudflare_ipv6_cidrs) : ["0.0.0.0/0", "::/0"]
}

resource "digitalocean_project" "this" {
  name        = var.project_name
  description = "RLFantasy ${var.environment} infrastructure"
  purpose     = "Web Application"
  environment = var.environment
}

resource "digitalocean_droplet" "this" {
  name       = var.droplet_name
  region     = var.region
  size       = var.droplet_size
  image      = var.droplet_image
  monitoring = var.enable_monitoring
  backups    = var.enable_droplet_backups
  ssh_keys   = var.ssh_key_fingerprints
  tags       = local.base_tags
  user_data  = var.user_data
  vpc_uuid   = var.vpc_uuid
}

resource "digitalocean_project_resources" "attach" {
  project = digitalocean_project.this.id
  resources = [
    digitalocean_droplet.this.urn,
  ]
}

resource "digitalocean_reserved_ip" "this" {
  count  = var.assign_reserved_ip ? 1 : 0
  region = var.region
}

resource "digitalocean_reserved_ip_assignment" "this" {
  count      = var.assign_reserved_ip ? 1 : 0
  ip_address = digitalocean_reserved_ip.this[0].ip_address
  droplet_id = digitalocean_droplet.this.id
}

resource "digitalocean_firewall" "this" {
  name = "${var.droplet_name}-fw"
  tags = local.base_tags

  droplet_ids = [digitalocean_droplet.this.id]

  inbound_rule {
    protocol         = "tcp"
    port_range       = "22"
    source_addresses = var.admin_cidrs
  }

  inbound_rule {
    protocol         = "tcp"
    port_range       = "80"
    source_addresses = local.web_sources
  }

  inbound_rule {
    protocol         = "tcp"
    port_range       = "443"
    source_addresses = local.web_sources
  }

  outbound_rule {
    protocol              = "tcp"
    port_range            = "1-65535"
    destination_addresses = ["0.0.0.0/0", "::/0"]
  }

  outbound_rule {
    protocol              = "udp"
    port_range            = "1-65535"
    destination_addresses = ["0.0.0.0/0", "::/0"]
  }

  outbound_rule {
    protocol              = "icmp"
    destination_addresses = ["0.0.0.0/0", "::/0"]
  }
}
