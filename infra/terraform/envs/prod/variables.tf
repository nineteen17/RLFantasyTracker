variable "do_token" {
  type        = string
  description = "DigitalOcean API token."
  sensitive   = true
}

variable "project_name" {
  type        = string
  description = "DigitalOcean project name."
  default     = "RLFantasyTracker"
}

variable "environment" {
  type        = string
  description = "Deployment environment label."
  default     = "production"
}

variable "region" {
  type        = string
  description = "DigitalOcean region slug."
}

variable "droplet_name" {
  type        = string
  description = "Droplet name."
  default     = "rlfantasy-prod"
}

variable "droplet_size" {
  type        = string
  description = "Droplet size slug."
}

variable "droplet_image" {
  type        = string
  description = "Droplet image slug."
  default     = "ubuntu-24-04-x64"
}

variable "ssh_key_fingerprints" {
  type        = list(string)
  description = "List of DO SSH key fingerprints."
}

variable "admin_cidrs" {
  type        = list(string)
  description = "CIDRs allowed to SSH to the origin."
}

variable "enable_cloudflare_origin_lock" {
  type        = bool
  description = "If true, only Cloudflare ranges can access 80/443."
  default     = true
}

variable "cloudflare_ipv4_cidrs" {
  type        = list(string)
  description = "Cloudflare IPv4 CIDRs."
  default     = []
}

variable "cloudflare_ipv6_cidrs" {
  type        = list(string)
  description = "Cloudflare IPv6 CIDRs."
  default     = []
}

variable "assign_reserved_ip" {
  type        = bool
  description = "Attach reserved IP to droplet."
  default     = true
}

variable "enable_monitoring" {
  type        = bool
  description = "Enable DO monitoring."
  default     = true
}

variable "enable_droplet_backups" {
  type        = bool
  description = "Enable droplet backups."
  default     = false
}

variable "vpc_uuid" {
  type        = string
  description = "Optional VPC UUID."
  default     = null
}

variable "extra_tags" {
  type        = list(string)
  description = "Additional tags."
  default     = []
}

variable "user_data" {
  type        = string
  description = "Optional cloud-init payload."
  default     = null
}
