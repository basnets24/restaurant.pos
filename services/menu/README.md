# MenuService (Restaurant POS)

Menu and catalog API for the Restaurant POS platform. Provides tenant‑aware CRUD for menu items, publishes domain events, and reacts to inventory events to keep availability in sync. Built with .NET 8, MongoDB, MassTransit/RabbitMQ, and JWT Bearer auth.

## Features
- Tenant‑scoped menu items stored in MongoDB
- REST API for list, detail, create, update, delete, set availability
- Authorization via scopes and roles:
  - Read: `menu.read`
  - Write: `menu.write` + roles `Admin|Manager|Chef`
- Publishes events on create/update/delete
- Consumers update availability on inventory events (depleted/restocked/updated)
- Serilog + Seq logging, CORS for the frontend, Swagger in Development

## Getting Started

### Prerequisites
- .NET SDK 8.0+
- MongoDB (local or container)
- RabbitMQ (local or container)
- Optional: Seq for structured logs

### Configuration
Defined in `appsettings.json` and overridable via environment variables or User Secrets.

- ServiceSettings
  - Authority: OIDC authority for JWT validation
- MongoDbSettings
  - Host, Port (and optional database/credentials if supported by Common.Library)
- RabbitMqSettings
  - Host (and optional username/password if configured in your environment)
- Cors
  - AllowedOrigins: array of allowed frontend origins
- SeqSettings
  - Host, Port for Seq


### Build and Run Scripts

#### Setup & Run
```bash
#!/bin/bash
# Build and run Menu Service (requires MongoDB, RabbitMQ, Identity Service)
cd services/menu/src/MenuService
dotnet restore
dotnet run  # http://localhost:5062
```


#### Docker Build
```bash
#!/bin/bash
# Build Docker image
cd services/menu
docker build --secret id=GH_OWNER --secret id=GH_PAT -t restaurant-pos/menu-service:1.0.3 .

docker run -d -p 5062:5062 \
  -e MongoDbSettings__ConnectionString="$cosmosDbString" \
  -e ServiceBusSettings__ConnectionString="$serviceBusConnString" \
  -e ServiceSettings__MessageBroker="SERVICEBUS" \
  --network pos_pos-net \
  --name menu-service-v1.0.3 \
  restaurant-pos/menu-service:1.0.3
```

### 🐳 Build & Push Docker Image (ARM64 TO AMD64 THAT IS AKS Compatible)
export version=1.0.0
export ACR=acrpos

docker buildx build \
  --platform linux/amd64 \
  --secret id=GH_OWNER --secret id=GH_PAT \
  -t "$ACR.azurecr.io/pos.catalog:$version" \
  --push .  

**Note**: The Docker build requires GitHub Personal Access Token with `read:packages` permission to access private NuGet packages.


## Create Kubernetes namespace 
```bash 
export namespace="catalog"
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

## API Overview

Base route: `/menu-items`

- `GET /menu-items` — list with filters `name`, `category`, `available`, `minPrice`, `maxPrice`, `page`, `pageSize` (requires `menu.read`)
- `GET /menu-items/{id}` — get by id (requires `menu.read`)
- `POST /menu-items` — create (requires `menu.write` + role `Admin|Manager|Chef`)
- `PATCH /menu-items/{id}` — partial update (requires `menu.write` + role)
- `DELETE /menu-items/{id}` — delete (requires `menu.write` + role)
- `GET /menu-items/categories` — list allowed categories (requires `menu.read`)
- `POST /menu-items/{id}:availability` — set availability boolean (requires `menu.write` + role)

Notes
- Requests are tenant‑scoped via `Common.Library.Tenancy`; created items carry `RestaurantId` and `LocationId` from the tenant context.
- Controller returns simple paged results; repository currently pages in‑memory.

## Messaging

- Publishes: `MenuItemCreated`, `MenuItemUpdated`, `MenuItemDeleted`
- Consumes (from Inventory): `InventoryItemDepleted`, `InventoryItemRestocked`, `InventoryItemUpdated`
- Configure RabbitMQ via `RabbitMqSettings`.

## Project Layout
- `Program.cs` — DI for Mongo, MassTransit, Tenancy, auth, Swagger, CORS
- `Controllers/` — menu items API
- `Entities/` — `MenuItem` entity and categories
- `Dtos.cs` — request/response DTOs and paging models
- `Auth/` — authorization policies (`menu.read`, `menu.write`)
- `Consumers/` — MassTransit consumers for inventory events

---

License: Proprietary (internal project).
