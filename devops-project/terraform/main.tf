# PeopleFlow HR - Azure infrastructure for ONE environment.
# The same code runs for dev, staging and prod; only the tfvars differ.
#
#   resource group
#   ├── network     VNet, AKS subnet, delegated Postgres subnet, private DNS
#   ├── monitoring  Log Analytics, action group, alerts
#   ├── acr         container registry (no admin user)
#   ├── aks         cluster: OIDC + Workload Identity, Key Vault CSI, Azure RBAC, Container Insights
#   ├── postgres    Flexible Server, private access only
#   └── keyvault    RBAC vault holding DATABASE_URL / DIRECT_URL / JWT_SECRET
#   + user-assigned identity federated to the app's Kubernetes service account

locals {
  name = "${var.project}-${var.environment}"
  # Globally unique, alphanumeric names (ACR, Key Vault) get a short suffix.
  short = "${var.project}${substr(var.environment, 0, 3)}"
  tags = {
    project     = var.project
    environment = var.environment
    owner       = var.owner
    managed_by  = "terraform"
  }
}

data "azurerm_client_config" "current" {}

resource "random_string" "suffix" {
  length  = 4
  upper   = false
  special = false
}

resource "azurerm_resource_group" "this" {
  name     = "rg-${local.name}"
  location = var.location
  tags     = local.tags
}

module "network" {
  source               = "./modules/network"
  name                 = local.name
  resource_group_name  = azurerm_resource_group.this.name
  location             = var.location
  vnet_cidr            = var.vnet_cidr
  aks_subnet_cidr      = var.aks_subnet_cidr
  postgres_subnet_cidr = var.postgres_subnet_cidr
  tags                 = local.tags
}

module "monitoring" {
  source              = "./modules/monitoring"
  name                = local.name
  resource_group_name = azurerm_resource_group.this.name
  location            = var.location
  alert_email         = var.alert_email
  retention_days      = var.log_retention_days
  tags                = local.tags
}

module "acr" {
  source              = "./modules/acr"
  name                = "acr${local.short}${random_string.suffix.result}"
  resource_group_name = azurerm_resource_group.this.name
  location            = var.location
  sku                 = var.acr_sku
  tags                = local.tags
}

module "aks" {
  source                     = "./modules/aks"
  name                       = "aks-${local.name}"
  resource_group_name        = azurerm_resource_group.this.name
  location                   = var.location
  kubernetes_version         = var.kubernetes_version
  sku_tier                   = var.aks_sku_tier
  subnet_id                  = module.network.aks_subnet_id
  vm_size                    = var.node_vm_size
  min_count                  = var.node_min_count
  max_count                  = var.node_max_count
  zones                      = var.availability_zones
  log_analytics_workspace_id = module.monitoring.workspace_id
  acr_id                     = module.acr.id
  admin_group_object_ids     = var.aks_admin_group_object_ids
  tenant_id                  = data.azurerm_client_config.current.tenant_id
  tags                       = local.tags
}

module "postgres" {
  source                       = "./modules/postgres"
  name                         = "psql-${local.name}-${random_string.suffix.result}"
  resource_group_name          = azurerm_resource_group.this.name
  location                     = var.location
  delegated_subnet_id          = module.network.postgres_subnet_id
  private_dns_zone_id          = module.network.postgres_private_dns_zone_id
  sku_name                     = var.postgres_sku
  storage_mb                   = var.postgres_storage_mb
  ha_enabled                   = var.postgres_ha_enabled
  pgbouncer_enabled            = var.postgres_pgbouncer_enabled
  backup_retention_days        = var.postgres_backup_retention_days
  geo_redundant_backup_enabled = var.postgres_geo_redundant_backup
  log_analytics_workspace_id   = module.monitoring.workspace_id
  tags                         = local.tags
}

module "keyvault" {
  source              = "./modules/keyvault"
  name                = "kv-${local.short}-${random_string.suffix.result}"
  resource_group_name = azurerm_resource_group.this.name
  location            = var.location
  tenant_id           = data.azurerm_client_config.current.tenant_id
  deployer_object_id  = data.azurerm_client_config.current.object_id
  reader_object_ids   = [azurerm_user_assigned_identity.app.principal_id]
  secrets = {
    "database-url" = module.postgres.pooled_connection_string
    "direct-url"   = module.postgres.direct_connection_string
    "jwt-secret"   = random_password.jwt.result
  }
  tags = local.tags
}

resource "random_password" "jwt" {
  length  = 64
  special = false
}

# ------------------------------------------------- Workload Identity (app)
# The pod's service account exchanges its Kubernetes token for an Entra token
# of this identity; the CSI driver then reads Key Vault as this identity.
resource "azurerm_user_assigned_identity" "app" {
  name                = "id-${local.name}-app"
  resource_group_name = azurerm_resource_group.this.name
  location            = var.location
  tags                = local.tags
}

resource "azurerm_federated_identity_credential" "app" {
  name                = "fic-${var.app_namespace}-${var.app_service_account}"
  resource_group_name = azurerm_resource_group.this.name
  parent_id           = azurerm_user_assigned_identity.app.id
  audience            = ["api://AzureADTokenExchange"]
  issuer              = module.aks.oidc_issuer_url
  subject             = "system:serviceaccount:${var.app_namespace}:${var.app_service_account}"
}

# ---------------------------------------- pipeline may deploy into the cluster
resource "azurerm_role_assignment" "pipeline_aks_writer" {
  count                = var.pipeline_principal_object_id == "" ? 0 : 1
  scope                = module.aks.id
  role_definition_name = "Azure Kubernetes Service RBAC Cluster Admin"
  principal_id         = var.pipeline_principal_object_id
}

resource "azurerm_role_assignment" "pipeline_aks_user" {
  count                = var.pipeline_principal_object_id == "" ? 0 : 1
  scope                = module.aks.id
  role_definition_name = "Azure Kubernetes Service Cluster User Role"
  principal_id         = var.pipeline_principal_object_id
}

resource "azurerm_role_assignment" "pipeline_acr_push" {
  count                = var.pipeline_principal_object_id == "" ? 0 : 1
  scope                = module.acr.id
  role_definition_name = "AcrPush"
  principal_id         = var.pipeline_principal_object_id
}

# --------------------------------------------------------- metric alerts
resource "azurerm_monitor_metric_alert" "aks_node_cpu" {
  name                = "alert-${local.name}-aks-node-cpu"
  resource_group_name = azurerm_resource_group.this.name
  scopes              = [module.aks.id]
  description         = "Average node CPU above 80% for 15 minutes."
  severity            = 2
  frequency           = "PT5M"
  window_size         = "PT15M"
  tags                = local.tags

  criteria {
    metric_namespace = "Microsoft.ContainerService/managedClusters"
    metric_name      = "node_cpu_usage_percentage"
    aggregation      = "Average"
    operator         = "GreaterThan"
    threshold        = 80
  }

  action {
    action_group_id = module.monitoring.action_group_id
  }
}

resource "azurerm_monitor_metric_alert" "postgres_cpu" {
  name                = "alert-${local.name}-postgres-cpu"
  resource_group_name = azurerm_resource_group.this.name
  scopes              = [module.postgres.id]
  description         = "Postgres CPU above 80% for 15 minutes."
  severity            = 2
  frequency           = "PT5M"
  window_size         = "PT15M"
  tags                = local.tags

  criteria {
    metric_namespace = "Microsoft.DBforPostgreSQL/flexibleServers"
    metric_name      = "cpu_percent"
    aggregation      = "Average"
    operator         = "GreaterThan"
    threshold        = 80
  }

  action {
    action_group_id = module.monitoring.action_group_id
  }
}

resource "azurerm_monitor_metric_alert" "postgres_storage" {
  name                = "alert-${local.name}-postgres-storage"
  resource_group_name = azurerm_resource_group.this.name
  scopes              = [module.postgres.id]
  description         = "Postgres storage above 85%."
  severity            = 1
  frequency           = "PT15M"
  window_size         = "PT30M"
  tags                = local.tags

  criteria {
    metric_namespace = "Microsoft.DBforPostgreSQL/flexibleServers"
    metric_name      = "storage_percent"
    aggregation      = "Average"
    operator         = "GreaterThan"
    threshold        = 85
  }

  action {
    action_group_id = module.monitoring.action_group_id
  }
}
