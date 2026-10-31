resource "azurerm_log_analytics_workspace" "this" {
  name                = "log-${var.name}"
  resource_group_name = var.resource_group_name
  location            = var.location
  sku                 = "PerGB2018"
  retention_in_days   = var.retention_days
  tags                = var.tags
}

resource "azurerm_monitor_action_group" "oncall" {
  name                = "ag-${var.name}-oncall"
  resource_group_name = var.resource_group_name
  short_name          = "pf-oncall"
  tags                = var.tags

  email_receiver {
    name                    = "oncall-email"
    email_address           = var.alert_email
    use_common_alert_schema = true
  }
}

# Log-based alert: the app logs 5xx responses / unhandled errors.
# Container Insights writes container stdout to ContainerLogV2.
resource "azurerm_monitor_scheduled_query_rules_alert_v2" "app_errors" {
  name                 = "alert-${var.name}-app-errors"
  resource_group_name  = var.resource_group_name
  location             = var.location
  description          = "More than 20 error log lines from peopleflow-web in 5 minutes."
  severity             = 2
  enabled              = true
  scopes               = [azurerm_log_analytics_workspace.this.id]
  evaluation_frequency = "PT5M"
  window_duration      = "PT5M"
  tags                 = var.tags

  criteria {
    query                   = <<-KQL
      ContainerLogV2
      | where PodNamespace startswith "peopleflow"
      | where ContainerName == "web"
      | where LogMessage has_any ("error", "Error", "ERR", "Unhandled")
    KQL
    time_aggregation_method = "Count"
    operator                = "GreaterThan"
    threshold               = 20
    failing_periods {
      minimum_failing_periods_to_trigger_alert = 1
      number_of_evaluation_periods             = 1
    }
  }

  action {
    action_groups = [azurerm_monitor_action_group.oncall.id]
  }
}

resource "azurerm_monitor_scheduled_query_rules_alert_v2" "pod_restarts" {
  name                 = "alert-${var.name}-pod-restarts"
  resource_group_name  = var.resource_group_name
  location             = var.location
  description          = "A peopleflow pod restarted more than 3 times in 15 minutes (crash loop)."
  severity             = 1
  enabled              = true
  scopes               = [azurerm_log_analytics_workspace.this.id]
  evaluation_frequency = "PT5M"
  window_duration      = "PT15M"
  tags                 = var.tags

  criteria {
    query                   = <<-KQL
      KubePodInventory
      | where Namespace startswith "peopleflow"
      | summarize Restarts = max(PodRestartCount) - min(PodRestartCount) by Name
      | where Restarts > 3
    KQL
    time_aggregation_method = "Count"
    operator                = "GreaterThan"
    threshold               = 0
    failing_periods {
      minimum_failing_periods_to_trigger_alert = 1
      number_of_evaluation_periods             = 1
    }
  }

  action {
    action_groups = [azurerm_monitor_action_group.oncall.id]
  }
}
