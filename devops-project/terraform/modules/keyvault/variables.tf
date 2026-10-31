variable "name" {
  type = string
  validation {
    condition     = length(var.name) >= 3 && length(var.name) <= 24
    error_message = "Key Vault names are 3-24 characters."
  }
}
variable "resource_group_name" { type = string }
variable "location" { type = string }
variable "tenant_id" { type = string }
variable "deployer_object_id" { type = string }
variable "reader_object_ids" { type = list(string) }
variable "secrets" {
  type      = map(string)
  sensitive = true
}
variable "tags" { type = map(string) }
