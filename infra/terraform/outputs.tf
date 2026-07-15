output "acr_login_server" {
  value = azurerm_container_registry.pos.login_server
}

output "aks_oidc_issuer_url" {
  value = azurerm_kubernetes_cluster.pos.oidc_issuer_url
}

output "servicebus_connection_string" {
  value     = azurerm_servicebus_namespace_authorization_rule.pos.primary_connection_string
  sensitive = true
}

output "keyvault_uri" {
  value = azurerm_key_vault.pos.vault_uri
}

output "aks_get_credentials_command" {
  description = "Run this after apply to configure kubectl locally."
  value       = "az aks get-credentials --name ${var.aks_name} --resource-group ${var.resource_group_name}"
}

output "service_identity_client_ids" {
  description = "Managed identity client IDs per service — used as identityClientId in Helm values."
  value       = { for k, v in azurerm_user_assigned_identity.svc : k => v.client_id }
}
