variable "name" { type = string }
variable "resource_group_name" { type = string }
variable "location" { type = string }
variable "kubernetes_version" {
  type    = string
  default = null
}
variable "sku_tier" { type = string }
variable "subnet_id" { type = string }
variable "vm_size" { type = string }
variable "min_count" { type = number }
variable "max_count" { type = number }
variable "zones" { type = list(string) }
variable "log_analytics_workspace_id" { type = string }
variable "acr_id" { type = string }
variable "admin_group_object_ids" { type = list(string) }
variable "tenant_id" { type = string }
variable "tags" { type = map(string) }
