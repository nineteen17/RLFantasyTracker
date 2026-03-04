output "public_ip" {
  value       = module.droplet_stack.public_ip
  description = "Public IP to use for DNS."
}

output "droplet_id" {
  value       = module.droplet_stack.droplet_id
  description = "Droplet id."
}

output "firewall_id" {
  value       = module.droplet_stack.firewall_id
  description = "Firewall id."
}

output "project_id" {
  value       = module.droplet_stack.project_id
  description = "Project id."
}
