output "vnet_id" { value = azurerm_virtual_network.this.id }
output "aks_subnet_id" { value = azurerm_subnet.aks.id }
output "postgres_subnet_id" { value = azurerm_subnet.postgres.id }

# Returned only after the VNet link exists, so the server is created after it.
output "postgres_private_dns_zone_id" {
  value      = azurerm_private_dns_zone.postgres.id
  depends_on = [azurerm_private_dns_zone_virtual_network_link.postgres]
}
