resource "azurerm_servicebus_namespace" "pos" {
  name                = var.servicebus_name
  location            = azurerm_resource_group.pos.location
  resource_group_name = azurerm_resource_group.pos.name
  sku                 = "Standard"
}

# MassTransit creates its own queues/topics on startup when the connection string is present.
# We store the connection string in Key Vault so services pick it up via ConfigureAzureKeyVault().
resource "azurerm_servicebus_namespace_authorization_rule" "pos" {
  name         = "RootManageSharedAccessKey"
  namespace_id = azurerm_servicebus_namespace.pos.id
  listen       = true
  send         = true
  manage       = true
}

resource "azurerm_key_vault_secret" "servicebus_connection_string" {
  name         = "RabbitMqSettings--ConnectionString"
  key_vault_id = azurerm_key_vault.pos.id
  value        = azurerm_servicebus_namespace_authorization_rule.pos.primary_connection_string

  depends_on = [azurerm_role_assignment.current_user_kv_admin]
}
