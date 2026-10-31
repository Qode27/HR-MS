resource "random_password" "admin" {
  length  = 32
  special = false # keeps the connection URL free of characters that need encoding
}

resource "azurerm_postgresql_flexible_server" "this" {
  name                = var.name
  resource_group_name = var.resource_group_name
  location            = var.location
  version             = "16"

  # Private access only: lives in the delegated subnet, no public endpoint.
  delegated_subnet_id           = var.delegated_subnet_id
  private_dns_zone_id           = var.private_dns_zone_id
  public_network_access_enabled = false

  administrator_login    = var.admin_login
  administrator_password = random_password.admin.result

  sku_name                     = var.sku_name
  storage_mb                   = var.storage_mb
  auto_grow_enabled            = true
  backup_retention_days        = var.backup_retention_days
  geo_redundant_backup_enabled = var.geo_redundant_backup_enabled
  zone                         = "1"

  dynamic "high_availability" {
    for_each = var.ha_enabled ? [1] : []
    content {
      mode                      = "ZoneRedundant"
      standby_availability_zone = "2"
    }
  }

  maintenance_window {
    day_of_week  = 0 # Sunday
    start_hour   = 2
    start_minute = 0
  }

  tags = var.tags

  lifecycle {
    ignore_changes = [zone, high_availability[0].standby_availability_zone]
  }
}

resource "azurerm_postgresql_flexible_server_database" "app" {
  name      = var.database_name
  server_id = azurerm_postgresql_flexible_server.this.id
  charset   = "UTF8"
  collation = "en_US.utf8"

  lifecycle {
    prevent_destroy = true # dropping this deletes all HR data
  }
}

# Built-in PgBouncer (General Purpose / Memory Optimized tiers only).
resource "azurerm_postgresql_flexible_server_configuration" "pgbouncer" {
  count     = var.pgbouncer_enabled ? 1 : 0
  name      = "pgbouncer.enabled"
  server_id = azurerm_postgresql_flexible_server.this.id
  value     = "true"
}

resource "azurerm_postgresql_flexible_server_configuration" "log_min_duration" {
  name      = "log_min_duration_statement"
  server_id = azurerm_postgresql_flexible_server.this.id
  value     = "500" # log queries slower than 500 ms
}

resource "azurerm_monitor_diagnostic_setting" "this" {
  name                       = "to-log-analytics"
  target_resource_id         = azurerm_postgresql_flexible_server.this.id
  log_analytics_workspace_id = var.log_analytics_workspace_id

  enabled_log {
    category = "PostgreSQLLogs"
  }

  metric {
    category = "AllMetrics"
  }
}

locals {
  host   = azurerm_postgresql_flexible_server.this.fqdn
  user   = var.admin_login
  pass   = random_password.admin.result
  db     = var.database_name
  direct = "postgresql://${local.user}:${local.pass}@${local.host}:5432/${local.db}?sslmode=require"
  pooled = var.pgbouncer_enabled ? "postgresql://${local.user}:${local.pass}@${local.host}:6432/${local.db}?sslmode=require&pgbouncer=true" : local.direct
}
