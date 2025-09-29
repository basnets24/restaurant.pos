# IdentityService (Restaurant POS)

A .NET 8 Identity and Authorization service for the Restaurant POS platform. It uses ASP.NET Core Identity + Duende IdentityServer for OpenID Connect/OAuth2, EF Core with PostgreSQL for persistence, and issues multi-tenant claims (restaurant/location) to downstream services.

## Features
- Duende IdentityServer: OIDC/OAuth2 with configurable clients, resources, and scopes
- ASP.NET Core Identity: user and role management with EF Core
- Multi‑tenant claims: issues `restaurant_id`, `location_id`, and `role` via a custom profile service
- HTTP or DB tenant claims provider: configurable via `TenantService:Mode`
- Swagger UI in Development, Serilog + Seq logging, CORS for the frontend

## Getting Started

### Prerequisites
- .NET SDK 8.0+
- PostgreSQL (local or container)
- Optional: Seq for structured logs

### Configuration
Settings are primarily in `appsettings.json` and can be overridden with environment variables or User Secrets.

- PostgresSettings
  - Host, Port, Database, Username, Password
- IdentitySettings (used by the seed hosted service)
  - AdminUserEmail, AdminUserPassword, RestaurantId, LocationId
- IdentityServerSettings
  - ApiScopes, ApiResources, Clients (in‑memory)
  - You may override a specific client secret at runtime via User Secrets using keys under `TenantService` (see below)
- TenantService
  - Mode: `Http` (default) or `Embedded`
  - BaseUrl: base URL of the Tenant service when `Mode` = `Http`
  - Authority, ClientId, ClientSecret, Scope: client‑credentials used to call the Tenant service (token retrieved from `Authority`)
- Cors
  - AllowedOrigins: array of allowed frontend origins

Example: set secrets for local development
```bash
# from this project directory
dotnet user-secrets set "IdentitySettings:AdminUserEmail" "admin@pos.local"
dotnet user-secrets set "IdentitySettings:AdminUserPassword" "YourSecurePassword123!"
# if using Http tenant mode, set confidential client secret out of appsettings
dotnet user-secrets set "TenantService:ClientSecret" "your-secure-client-secret"
```



### Build and Run Scripts

#### Setup & Run
```bash
#!/bin/bash
# Build and run Identity Service
cd services/identity/src/IdentityService
dotnet restore
dotnet ef database update
dotnet run  # http://localhost:5265
```

- Swagger UI: `/swagger` (Development only)
- IdentityServer endpoints: `/connect/*`

The `IdentitySeedHostedService` runs on startup to:
- Ensure required roles exist (e.g., `Admin`)
- Create an initial admin user from `IdentitySettings` if it does not exist


### Docker

#### Build and Run with Docker

1. **Set up GitHub Personal Access Token** (required for private NuGet packages):
   ```bash
   export GH_OWNER=your-github-username
   export GH_PAT="your_github_personal_access_token_here"
   ```

2. **Build the Docker image** (run from services/identity directory):
   ```bash
   cd services/identity
   docker build --secret id=GH_OWNER --secret id=GH_PAT -t identity-service:1.0.3 .
   ```


3. **Run the container**:
   ```bash
  docker run -d -p 5265:5265 \
  -e PostgresSettings__ConnectionString="$PostGresConnString" \
  -e IdentitySettings__AdminUserPassword="@Admin_Password" \
  --network pos_pos-net \
  --name identity-service-v1.0.3 \
  restaurant-pos/identity-service:1.0.3
   ```

4. **Check container logs**:
   ```bash
   docker logs identity-service
   ```

### 🐳 Build & Push Docker Image (ARM64 TO AMD64 THAT IS AKS Compatible)
export version=1.0.3
export ACR=acrpos

docker buildx build \
  --platform linux/amd64 \
  --secret id=GH_OWNER --secret id=GH_PAT \
  -t "$ACR.azurecr.io/pos.identity:$version" \
  --push .  

**Note**: The Docker build requires GitHub Personal Access Token with `read:packages` permission to access private NuGet packages.


## Create Kubernetes namespace 
```bash 
export namespace="identity"
kubectl create namespace $namespace 

## Creating Azure Managed Identity and granting it access to Key Vault Store 
```bash

az identity create --resource-group $RG --name $namespace 

export IDENTITY_CLIENT_ID=$(az identity show -g "$RG" -n "$namespace" --query clientId -o tsv)
export SUBSCRIPTION_ID=$(az account show --query id -o tsv)

az role assignment create \
  --assignee "$IDENTITY_CLIENT_ID" \
  --role "Key Vault Secrets User" \
  --scope "/subscriptions/$SUBSCRIPTION_ID/resourceGroups/$RG/providers/Microsoft.KeyVault/vaults/$KV"

```

## Establish the related Identity Credential
```bash
export AKS_OIDC_ISSUER="$(az aks show -n $AKS -g $RG --query "oidcIssuerProfile.issuerUrl" -otsv)"

az identity federated-credential create --name ${namespace} --identity-name "${namespace}" --resource-group "${RG}" --issuer "${AKS_OIDC_ISSUER}" --subject system:serviceaccount:"${namespace}":"${namespace}-serviceaccount" --audience api://AzureADTokenExchange
```
## install helm chart 
```bash 
helmUser="00000000-0000-0000-0000-000000000000"
helmPassword=$(az acr login --name $ACR --expose-token --output tsv --query accessToken)
helm registry login $ACR.azurecr.io --username $helmUser --password $helmPassword 

chartVersion="0.1.1"
helm upgrade pos-identity-service oci://$ACR.azurecr.io/helm/pos-microservice --version $chartVersion -f ./helm/values.yaml -n $namespace --install
```

## API Overview

All endpoints are protected with IdentityServer’s Local API policy unless noted. Key routes:

- Users
  - `GET /users/me` — current authenticated user profile
  - `GET /users` — paged list (Admin only). Filters: `username`, `role`, `page`, `pageSize`
  - `GET /users/{userId}` — user details (Admin only)
  - `PUT /users/{userId}` — update identity fields (Admin only)
  - `DELETE /users/{userId}` — soft‑disable/lock user (Admin only)
  - `GET /users/{userId}/roles` — list roles (Admin only)
  - `POST /users/{userId}/roles` — add roles (Admin only)
  - `DELETE /users/{userId}/roles/{role}` — remove a role (Admin only)

- Employees (tenant‑scoped)
  - `GET /tenants/{restaurantId}/employees` — paged list with optional `q`, `role`
  - `GET /tenants/{restaurantId}/employees/{userId}` — details
  - `PUT /tenants/{restaurantId}/employees/{userId}` — update identity fields
  - `GET /tenants/{restaurantId}/employees/{userId}/roles` — list tenant roles
  - `POST /tenants/{restaurantId}/employees/{userId}/roles` — add tenant roles
  - `DELETE /tenants/{restaurantId}/employees/{userId}/roles/{role}` — remove one tenant role
  - `PUT /tenants/{restaurantId}/employees/{userId}/default-location` — set default location
  - `GET /tenants/{restaurantId}/employees/roles` — available tenant role names

## Project Layout
- `Program.cs` — service wiring (IdentityServer, Identity, EF Core, CORS, Serilog)
- `Extensions/` — DI helpers for IdentityServer, EF/Identity, and tenant claims provider
- `Settings/` — strongly‑typed settings models
- `Controllers/` — users and tenant employees endpoints
- `Services/` — profile service and tenant claims providers (HTTP/DB)
- `Entities/` — ASP.NET Identity entities
- `Contracts/` — DTOs used by the API
- `Migrations/` — EF Core migrations

## Notes
- In `Development`, CORS is enabled using `Cors:AllowedOrigins` and Swagger UI is available.
- The tenant claims provider defaults to `Http` mode; set `TenantService:Mode = "Db"` to use the local database provider.

---

License: Proprietary (internal project).
