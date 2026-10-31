environment = "prod"
location    = "centralindia"
alert_email = "oncall@example.com"

vnet_cidr            = "10.30.0.0/16"
aks_subnet_cidr      = "10.30.0.0/22"
postgres_subnet_cidr = "10.30.8.0/24"

aks_sku_tier       = "Standard" # uptime SLA
node_vm_size       = "Standard_D4s_v5"
node_min_count     = 3
node_max_count     = 10
availability_zones = ["1", "2", "3"]

acr_sku = "Standard"

postgres_sku                   = "GP_Standard_D4ds_v5"
postgres_storage_mb            = 131072
postgres_ha_enabled            = true # zone-redundant standby
postgres_pgbouncer_enabled     = true
postgres_backup_retention_days = 35
postgres_geo_redundant_backup  = true

log_retention_days = 90
