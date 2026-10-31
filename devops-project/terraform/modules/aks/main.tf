resource "azurerm_kubernetes_cluster" "this" {
  name                = var.name
  resource_group_name = var.resource_group_name
  location            = var.location
  dns_prefix          = var.name
  kubernetes_version  = var.kubernetes_version
  sku_tier            = var.sku_tier

  automatic_upgrade_channel = "patch"
  node_os_upgrade_channel   = "NodeImage"

  # Identity & access
  local_account_disabled            = true # no static admin kubeconfig
  role_based_access_control_enabled = true
  oidc_issuer_enabled               = true # needed for Workload Identity
  workload_identity_enabled         = true

  azure_active_directory_role_based_access_control {
    azure_rbac_enabled     = true
    tenant_id              = var.tenant_id
    admin_group_object_ids = var.admin_group_object_ids
  }

  identity {
    type = "SystemAssigned"
  }

  default_node_pool {
    name                         = "system"
    vm_size                      = var.vm_size
    vnet_subnet_id               = var.subnet_id
    auto_scaling_enabled         = true
    min_count                    = var.min_count
    max_count                    = var.max_count
    zones                        = var.zones
    os_disk_type                 = "Managed"
    max_pods                     = 60
    temporary_name_for_rotation  = "systemtmp"
    only_critical_addons_enabled = false

    upgrade_settings {
      max_surge = "33%"
    }
  }

  network_profile {
    network_plugin      = "azure"
    network_plugin_mode = "overlay"
    network_data_plane  = "cilium"
    network_policy      = "cilium" # enforces the chart's NetworkPolicies
    service_cidr        = "10.0.0.0/16"
    dns_service_ip      = "10.0.0.10"
    pod_cidr            = "192.168.0.0/16"
    load_balancer_sku   = "standard"
  }

  # Add-ons
  key_vault_secrets_provider {
    secret_rotation_enabled  = true
    secret_rotation_interval = "2m"
  }

  oms_agent {
    log_analytics_workspace_id      = var.log_analytics_workspace_id
    msi_auth_for_monitoring_enabled = true
  }

  web_app_routing {
    dns_zone_ids = [] # managed NGINX ingress, class webapprouting.kubernetes.azure.com
  }

  tags = var.tags

  lifecycle {
    ignore_changes = [
      default_node_pool[0].node_count, # owned by the cluster autoscaler
      kubernetes_version,              # owned by the auto-upgrade channel
    ]
  }
}

# Let the kubelet pull images from ACR without any registry password.
resource "azurerm_role_assignment" "acr_pull" {
  scope                            = var.acr_id
  role_definition_name             = "AcrPull"
  principal_id                     = azurerm_kubernetes_cluster.this.kubelet_identity[0].object_id
  skip_service_principal_aad_check = true
}

# AKS needs to manage NICs / load balancers in the custom subnet.
resource "azurerm_role_assignment" "network_contributor" {
  scope                = var.subnet_id
  role_definition_name = "Network Contributor"
  principal_id         = azurerm_kubernetes_cluster.this.identity[0].principal_id
}
