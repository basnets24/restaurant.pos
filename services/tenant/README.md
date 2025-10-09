# TenantService

Multi‑tenant management service for the Restaurant POS platform. Built with .NET 8, EF Core (PostgreSQL), and JWT Bearer auth.

## Prerequisites
- .NET SDK 8.0+
- PostgreSQL database

### Build and Run Scripts

#### Setup & Run
```bash
#!/bin/bash
# Build and run Tenant Service
cd services/tenant/src/TenantService
dotnet restore
dotnet ef database update
dotnet run  # http://localhost:5200
```

#### Docker Build
```bash
#!/bin/bash
# Build Docker image
cd services/tenant
docker build --secret id=GH_OWNER --secret id=GH_PAT -t restaurant-pos/tenant-service:1.0.0 .
docker run -d -p 5200:5200 restaurant-pos/tenant-service:1.0.0
```

### Manual Steps

#### Run
```bash
dotnet run
```
- Swagger UI: `/swagger` (Development only)

### Docker

#### Build and Run with Docker

1. **Set up GitHub Personal Access Token** (required for private NuGet packages):
   ```bash
   export GH_OWNER=your-github-username
   export GH_PAT="your_github_personal_access_token_here"
   ```

2. **Build the Docker image** (run from services/tenant directory):
   ```bash
   cd services/tenant
   docker build --secret id=GH_OWNER --secret id=GH_PAT -t tenant-service:1.0.0 .

   export version=1.0.0
   export ACR=acrpos

   docker buildx build \
  --platform linux/amd64 \
  --secret id=GH_OWNER --secret id=GH_PAT \
  -t "$ACR.azurecr.io/pos.tenant:$version" \
  --push .


   ```
## Create Kubernetes namespace 
```bash 
export namespace="tenant"
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
helm upgrade pos-$namespace-service oci://$ACR.azurecr.io/helm/pos-microservice --version $chartVersion -f ./helm/values.yaml -n $namespace --install
```

3. **Run the container**:
   ```bash
   docker run -d -p 5200:5200 \
  -e PostgresSettings__ConnectionString="$PostGresConnString" \
  --network pos_pos-net \
  --name tenant-service-v1.0.1 \
  restaurant-pos/tenant-service:1.0.1
   ```

4. **Check container logs**:
   ```bash
   docker logs tenant-service
   ```

**Note**: The Docker build requires GitHub Personal Access Token with `read:packages` permission to access private NuGet packages.

## API Overview

All endpoints require JWT Bearer authentication unless noted.

- Onboarding (`/api/onboarding`)
  - `POST /api/onboarding/restaurant` — create restaurant; body: `{ name, locationName?, timeZoneId? }`
  - `POST /api/onboarding/join` — join by code (restaurant id or slug); body: `{ code }`
  - `GET /api/onboarding/status` — membership + admin status for current user
  - `GET /api/onboarding/me/code` — join code for current user’s latest restaurant

- Tenants (`/tenants`)
  - `GET /tenants/mine` — restaurants the user belongs to
  - `GET /tenants/{restaurantId}` — restaurant + locations detail

- Internal (for IdentityService only)
  - `GET /internal/users/{userId}/tenant-claims` — returns `{ restaurantId, locationId, roles[] }`
    - Requires scope policy `tenant.claims.read`

## Project Layout
- `Program.cs` — authentication/authorization, EF Core, Swagger, CORS
- `Controllers/` — Onboarding, Tenants, Internal tenant-claims endpoints
- `Services/` — onboarding workflows and helpers
- `Settings/` — strongly‑typed configuration for PostgreSQL
- `Contracts/` — DTOs used by controllers
- `Tenant.Domain` — shared domain (DbContext + entities)

## Notes
- Set `Cors:AllowedOrigins` to your frontend’s URL(s) in development.
- Logging to Seq is configured via `SeqSettings` (optional).

---

License: Proprietary (internal project).
