variable "name" {
  type = string
  validation {
    condition     = can(regex("^[a-z0-9]{5,50}$", var.name))
    error_message = "ACR names are 5-50 lowercase letters/digits."
  }
}
variable "resource_group_name" { type = string }
variable "location" { type = string }
variable "sku" { type = string }
variable "tags" { type = map(string) }
