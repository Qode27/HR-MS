environment = "staging"
location    = "centralindia"
alert_email = "devops-team@example.com"

vnet_cidr            = "10.20.0.0/16"
aks_subnet_cidr      = "10.20.0.0/22"
postgres_subnet_cidr = "10.20.8.0/24"

aks_sku_tier   = "Free"
node_vm_size   = "Standard_D2s_v5"
node_min_count = 2
node_max_count = 4

acr_sku = "Basic"

postgres_sku                   = "GP_Standard_D2ds_v5"
postgres_storage_mb            = 65536
postgres_ha_enabled            = false
postgres_pgbouncer_enabled     = true
postgres_backup_retention_days = 7

log_retention_days = 30
