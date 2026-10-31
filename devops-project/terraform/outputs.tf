# These feed the pipeline variable group and the Helm values-<env>.yaml file.

output "resource_group_name" {
  value = azurerm_resource_group.this.name
}

output "aks_cluster_name" {
  value = module.aks.name
}

output "acr_name" {
  value = module.acr.name
}

output "acr_login_server" {
  value = module.acr.login_server
}

output "key_vault_name" {
  value = module.keyvault.name
}

output "tenant_id" {
  value = data.azurerm_client_config.current.tenant_id
}

output "workload_identity_client_id" {
  description = "Put in values-<env>.yaml -> serviceAccount.workloadIdentityClientId"
  value       = azurerm_user_assigned_identity.app.client_id
}

output "postgres_fqdn" {
  value = module.postgres.fqdn
}

output "log_analytics_workspace_id" {
  value = module.monitoring.workspace_id
}

output "get_credentials_command" {
  value = "az aks get-credentials -g ${azurerm_resource_group.this.name} -n ${module.aks.name} && kubelogin convert-kubeconfig -l azurecli"
}
