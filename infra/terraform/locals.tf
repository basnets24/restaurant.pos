locals {
  # Each entry: namespace the service runs in, and the HTTP port it listens on inside the container.
  # The Helm chart sets service.port=80 (ClusterIP), container.port is the app's actual listen port.
  services = {
    identity-service = { namespace = "identity",  container_port = 5265 }
    tenant-service   = { namespace = "tenant",    container_port = 5200 }
    menu-service     = { namespace = "menu",      container_port = 5062 }
    inventory-service = { namespace = "inventory", container_port = 5094 }
    order-service    = { namespace = "order",     container_port = 5236 }
    payment-service  = { namespace = "payment",   container_port = 5238 }
    frontend         = { namespace = "frontend",  container_port = 80   }
  }

  # Env vars applied to every backend microservice via Helm envVariables.
  # Service-specific vars (connection strings, Stripe keys) come from Key Vault at runtime
  # via the Azure Key Vault provider for .NET (builder.Host.ConfigureAzureKeyVault()).
  common_env = {
    "ServiceSettings__MessageBroker" = "SERVICEBUS"
    "ServiceSettings__KeyVaultName"  = var.keyvault_name
    "ServiceSettings__Authority"     = "https://${var.domain}/identity-svc"
    "SeqSettings__Host"              = "seq"
  }
}
