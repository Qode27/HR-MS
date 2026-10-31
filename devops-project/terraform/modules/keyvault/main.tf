resource "azurerm_key_vault" "this" {
  name                       = var.name
  resource_group_name        = var.resource_group_name
  location                   = var.location
  tenant_id                  = var.tenant_id
  sku_name                   = "standard"
  enable_rbac_authorization  = true # access via Azure roles, not access policies
  purge_protection_enabled   = true
  soft_delete_retention_days = 7
  tags                       = var.tags

  network_acls {
    default_action = "Allow" # tighten to Deny + private endpoint in prod (see SECURITY-FINDINGS.md)
    bypass         = "AzureServices"
  }
}

# Terraform itself writes the secrets.
resource "azurerm_role_assignment" "deployer" {
  scope                = azurerm_key_vault.this.id
  role_definition_name = "Key Vault Secrets Officer"
  principal_id         = var.deployer_object_id
}

# The app identity may only READ secrets.
resource "azurerm_role_assignment" "readers" {
  for_each             = toset(var.reader_object_ids)
  scope                = azurerm_key_vault.this.id
  role_definition_name = "Key Vault Secrets User"
  principal_id         = each.value
}

# Azure RBAC can take a minute to propagate before the data plane accepts writes.
resource "time_sleep" "rbac_propagation" {
  depends_on      = [azurerm_role_assignment.deployer]
  create_duration = "60s"
}

resource "azurerm_key_vault_secret" "this" {
  for_each        = nonsensitive(toset(keys(var.secrets)))
  name            = each.key
  value           = var.secrets[each.key]
  key_vault_id    = azurerm_key_vault.this.id
  content_type    = "text/plain"
  expiration_date = timeadd(plantimestamp(), "8760h") # 1 year; rotate before expiry

  depends_on = [time_sleep.rbac_propagation]

  lifecycle {
    ignore_changes = [expiration_date]
  }
}
