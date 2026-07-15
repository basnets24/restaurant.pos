# One managed identity per microservice.
# The Helm chart annotates each pod's ServiceAccount with the client ID (azure.workload.identity/client-id),
# and the pod's deployment template sets azure.workload.identity/use: "true".
resource "azurerm_user_assigned_identity" "svc" {
  for_each            = local.services
  name                = "id-${each.key}"
  resource_group_name = azurerm_resource_group.pos.name
  location            = azurerm_resource_group.pos.location
}

# Federated credential: links the AKS OIDC issuer + namespace + ServiceAccount name
# to the managed identity, enabling pods to get Azure tokens without storing secrets.
# ServiceAccount name comes from the Helm template: {{ .Values.microserviceName }}-serviceaccount
resource "azurerm_federated_identity_credential" "svc" {
  for_each            = local.services
  name                = "fic-${each.key}"
  resource_group_name = azurerm_resource_group.pos.name
  parent_id           = azurerm_user_assigned_identity.svc[each.key].id
  audience            = ["api://AzureADTokenExchange"]
  issuer              = azurerm_kubernetes_cluster.pos.oidc_issuer_url
  subject             = "system:serviceaccount:${each.value.namespace}:${each.key}-serviceaccount"
}
