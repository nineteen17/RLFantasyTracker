variable "project_name" {
  type        = string
  description = "DigitalOcean project name."
}

variable "environment" {
  type        = string
  description = "Environment name (e.g. prod)."
}

variable "region" {
  type        = string
  description = "Droplet region slug (e.g. syd1)."
}

variable "droplet_name" {
  type        = string
  description = "Droplet resource name."
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
  description = "DO SSH key fingerprints allowed on droplet."
}

variable "admin_cidrs" {
  type        = list(string)
  description = "CIDRs allowed to SSH to droplet."
}

variable "enable_cloudflare_origin_lock" {
  type        = bool
  description = "Restrict HTTP/HTTPS ingress to Cloudflare IP ranges."
  default     = true
}

variable "cloudflare_ipv4_cidrs" {
  type        = list(string)
  description = "Cloudflare IPv4 ranges allowed to hit origin."
  default     = []
}

variable "cloudflare_ipv6_cidrs" {
  type        = list(string)
  description = "Cloudflare IPv6 ranges allowed to hit origin."
  default     = []
}

variable "assign_reserved_ip" {
  type        = bool
  description = "Assign a reserved IP to the droplet."
  default     = true
}

variable "enable_monitoring" {
  type        = bool
  description = "Enable droplet monitoring agent."
  default     = true
}

variable "enable_droplet_backups" {
  type        = bool
  description = "Enable DO droplet backup snapshots."
  default     = false
}

variable "vpc_uuid" {
  type        = string
  description = "Optional VPC UUID."
  default     = null
}

variable "extra_tags" {
  type        = list(string)
  description = "Additional tags to attach."
  default     = []
}

variable "user_data" {
  type        = string
  description = "Optional cloud-init user data."
  default     = null
}
