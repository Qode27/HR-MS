variable "name" { type = string }
variable "resource_group_name" { type = string }
variable "location" { type = string }
variable "delegated_subnet_id" { type = string }
variable "private_dns_zone_id" { type = string }
variable "admin_login" {
  type    = string
  default = "pfadmin"
}
variable "database_name" {
  type    = string
  default = "peopleflow"
}
variable "sku_name" { type = string }
variable "storage_mb" { type = number }
variable "ha_enabled" { type = bool }
variable "pgbouncer_enabled" {
  type    = bool
  default = false
}
variable "backup_retention_days" { type = number }
variable "geo_redundant_backup_enabled" { type = bool }
variable "log_analytics_workspace_id" { type = string }
variable "tags" { type = map(string) }
