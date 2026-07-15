resource "azurerm_kubernetes_cluster" "pos" {
  name                = var.aks_name
  location            = azurerm_resource_group.pos.location
  resource_group_name = azurerm_resource_group.pos.name
  dns_prefix          = var.aks_name

  default_node_pool {
    name       = "default"
    node_count = var.node_count
    vm_size    = var.node_vm_size
  }

  identity {
    type = "SystemAssigned"
  }

  # Required for Workload Identity Federation.
  oidc_issuer_enabled       = true
  workload_identity_enabled = true
}
