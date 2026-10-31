output "id" { value = azurerm_postgresql_flexible_server.this.id }
output "fqdn" { value = azurerm_postgresql_flexible_server.this.fqdn }

# Prisma: DATABASE_URL (app traffic, may go through PgBouncer) and
# DIRECT_URL (migrations, always direct). Both end up in Key Vault only.
output "pooled_connection_string" {
  value     = local.pooled
  sensitive = true
}
output "direct_connection_string" {
  value     = local.direct
  sensitive = true
}
