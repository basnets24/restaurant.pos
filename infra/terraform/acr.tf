resource "azurerm_container_registry" "pos" {
  name                = var.acr_name
  resource_group_name = azurerm_resource_group.pos.name
  location            = azurerm_resource_group.pos.location
  sku                 = "Basic"

  # Admin enabled so the Helm provider can authenticate to OCI helm charts in ACR.
  # Credentials are passed to helm_release resources in helm.tf.
  admin_enabled = true
}

# Grant AKS kubelet identity permission to pull images from ACR.
resource "azurerm_role_assignment" "aks_acr_pull" {
  principal_id         = azurerm_kubernetes_cluster.pos.kubelet_identity[0].object_id
  role_definition_name = "AcrPull"
  scope                = azurerm_container_registry.pos.id
}
