variable "environment" {
  description = "Environment name: dev, staging or prod."
  type        = string
  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "environment must be dev, staging or prod."
  }
}

variable "location" {
  description = "Azure region."
  type        = string
  default     = "centralindia"
}

variable "project" {
  description = "Short project name used in resource names."
  type        = string
  default     = "peopleflow"
}

variable "owner" {
  description = "Team or person tag."
  type        = string
  default     = "platform-team"
}

# ---------------------------------------------------------------- network
variable "vnet_cidr" {
  type    = string
  default = "10.10.0.0/16"
}

variable "aks_subnet_cidr" {
  type    = string
  default = "10.10.0.0/22"
}

variable "postgres_subnet_cidr" {
  type    = string
  default = "10.10.8.0/24"
}

# -------------------------------------------------------------------- aks
variable "kubernetes_version" {
  description = "AKS version (null = current default). Check: az aks get-versions -l <region>"
  type        = string
  default     = null
}

variable "aks_sku_tier" {
  description = "Free for labs, Standard (uptime SLA) for prod."
  type        = string
  default     = "Free"
}

variable "node_vm_size" {
  type    = string
  default = "Standard_D2s_v5"
}

variable "node_min_count" {
  type    = number
  default = 1
}

variable "node_max_count" {
  type    = number
  default = 3
}

variable "availability_zones" {
  description = "Zones for the node pool (empty in regions without zones)."
  type        = list(string)
  default     = []
}

variable "aks_admin_group_object_ids" {
  description = "Entra ID groups that get cluster-admin through Azure RBAC."
  type        = list(string)
  default     = []
}

variable "pipeline_principal_object_id" {
  description = "Object id of the pipeline service principal (deploys with Helm)."
  type        = string
  default     = ""
}

# --------------------------------------------------------------- registry
variable "acr_sku" {
  type    = string
  default = "Basic"
}

# --------------------------------------------------------------- postgres
variable "postgres_sku" {
  type    = string
  default = "B_Standard_B1ms"
}

variable "postgres_storage_mb" {
  type    = number
  default = 32768
}

variable "postgres_ha_enabled" {
  description = "Zone-redundant HA (needs a GeneralPurpose SKU)."
  type        = bool
  default     = false
}

variable "postgres_pgbouncer_enabled" {
  description = "Built-in PgBouncer (not available on Burstable SKUs)."
  type        = bool
  default     = false
}

variable "postgres_backup_retention_days" {
  type    = number
  default = 7
}

variable "postgres_geo_redundant_backup" {
  type    = bool
  default = false
}

# ------------------------------------------------------------- monitoring
variable "alert_email" {
  description = "Where alerts are emailed."
  type        = string
}

variable "log_retention_days" {
  type    = number
  default = 30
}

# ------------------------------------------------------- workload identity
variable "app_namespace" {
  description = "Kubernetes namespace the app runs in."
  type        = string
  default     = "peopleflow"
}

variable "app_service_account" {
  description = "Service account name = Helm release name (chart default)."
  type        = string
  default     = "peopleflow"
}
