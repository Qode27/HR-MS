# terraform plan -var-file=environments/dev.tfvars
environment = "dev"
location    = "centralindia"
alert_email = "devops-team@example.com"

aks_sku_tier   = "Free"
node_vm_size   = "Standard_D2s_v5"
node_min_count = 1
node_max_count = 3

acr_sku = "Basic"

postgres_sku                   = "B_Standard_B1ms" # burstable = cheap for labs
postgres_storage_mb            = 32768
postgres_ha_enabled            = false
postgres_pgbouncer_enabled     = false
postgres_backup_retention_days = 7

log_retention_days = 30

# Fill these in once you know them:
# aks_admin_group_object_ids   = ["<Entra group object id>"]
# pipeline_principal_object_id = "<service connection SP object id>"
