resource "azurerm_key_vault" "pos" {
  name                       = var.keyvault_name
  location                   = azurerm_resource_group.pos.location
  resource_group_name        = azurerm_resource_group.pos.name
  tenant_id                  = data.azurerm_client_config.current.tenant_id
  sku_name                   = "standard"
  enable_rbac_authorization  = true
  purge_protection_enabled   = false
  soft_delete_retention_days = 7
}

# Allow the Terraform caller (you / CI service principal) to write secrets during apply.
resource "azurerm_role_assignment" "current_user_kv_admin" {
  principal_id         = data.azurerm_client_config.current.object_id
  role_definition_name = "Key Vault Administrator"
  scope                = azurerm_key_vault.pos.id
}

# Give each service's managed identity read access to Key Vault secrets.
# The .NET ConfigureAzureKeyVault() extension uses this to pull secrets at startup.
resource "azurerm_role_assignment" "svc_kv_secrets_user" {
  for_each             = azurerm_user_assigned_identity.svc
  principal_id         = each.value.principal_id
  role_definition_name = "Key Vault Secrets User"
  scope                = azurerm_key_vault.pos.id
}

resource "azurerm_key_vault_secret" "mongo_connection_string" {
  name         = "MongoDbSettings--ConnectionString"
  key_vault_id = azurerm_key_vault.pos.id
  value        = var.atlas_connection_string

  depends_on = [azurerm_role_assignment.current_user_kv_admin]
}

resource "azurerm_key_vault_secret" "postgres_connection_string" {
  name         = "PostgresSettings--ConnectionString"
  key_vault_id = azurerm_key_vault.pos.id
  value        = var.supabase_connection_string

  depends_on = [azurerm_role_assignment.current_user_kv_admin]
}

# Placeholder secrets you must populate manually after first apply.
# Set via: az keyvault secret set --vault-name keyv-pos --name <name> --value <value>
resource "azurerm_key_vault_secret" "stripe_secret_key" {
  name         = "Stripe--SecretKey"
  key_vault_id = azurerm_key_vault.pos.id
  value        = "REPLACE_ME"

  depends_on = [azurerm_role_assignment.current_user_kv_admin]

  lifecycle {
    ignore_changes = [value]
  }
}

resource "azurerm_key_vault_secret" "stripe_webhook_secret" {
  name         = "Stripe--WebhookSecret"
  key_vault_id = azurerm_key_vault.pos.id
  value        = "REPLACE_ME"

  depends_on = [azurerm_role_assignment.current_user_kv_admin]

  lifecycle {
    ignore_changes = [value]
  }
}

resource "azurerm_key_vault_secret" "identity_admin_password" {
  name         = "IdentitySettings--AdminUserPassword"
  key_vault_id = azurerm_key_vault.pos.id
  value        = "REPLACE_ME"

  depends_on = [azurerm_role_assignment.current_user_kv_admin]

  lifecycle {
    ignore_changes = [value]
  }
}
