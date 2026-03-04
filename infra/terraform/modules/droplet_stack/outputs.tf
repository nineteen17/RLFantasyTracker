output "droplet_id" {
  value       = digitalocean_droplet.this.id
  description = "Droplet id."
}

output "droplet_name" {
  value       = digitalocean_droplet.this.name
  description = "Droplet name."
}

output "droplet_ipv4" {
  value       = digitalocean_droplet.this.ipv4_address
  description = "Droplet public IPv4."
}

output "reserved_ip" {
  value       = var.assign_reserved_ip ? digitalocean_reserved_ip.this[0].ip_address : null
  description = "Reserved IP address, when enabled."
}

output "public_ip" {
  value       = var.assign_reserved_ip ? digitalocean_reserved_ip.this[0].ip_address : digitalocean_droplet.this.ipv4_address
  description = "Canonical public IP for DNS records."
}

output "firewall_id" {
  value       = digitalocean_firewall.this.id
  description = "Firewall id."
}

output "project_id" {
  value       = digitalocean_project.this.id
  description = "DO project id."
}
