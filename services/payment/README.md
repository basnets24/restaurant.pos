-[0-
p0\=\# PaymentService (Restaurant POS)

Payment orchestration for the Restaurant POS platform. Creates Stripe Checkout sessions on request, handles webhooks to mark payments succeeded/failed, and exposes a simple query to retrieve a pending session URL. Built with .NET 8, MongoDB, MassTransit/RabbitMQ, and Stripe.

## Features
- Tenant‑scoped payment records in MongoDB
- Stripe Checkout integration (server‑side session creation + webhook processing)
- Messaging integration with the order workflow
  - Consumes: `PaymentRequested`
  - Publishes: `PaymentSessionCreated`, `PaymentSucceeded`, `PaymentFailed`
- CORS for frontend, Swagger in Development, health endpoints

## Getting Started

### Prerequisites
- .NET SDK 8.0+
- MongoDB (local or container)
- RabbitMQ (local or container)
- Stripe account and API keys (secret + webhook signing secret)

### Configuration
Configured via `appsettings.json` and environment variables or User Secrets.

- ServiceSettings
  - Authority: OIDC authority (if auth is added later); currently not required by controllers
- MongoDbSettings
  - Host, Port (and optional credentials depending on Common.Library)
- RabbitMqSettings
  - Host (and optional username/password if required)
- Cors
  - AllowedOrigins: array of allowed frontend origins
- Frontend
  - PublicBaseUrl: base URL used to build success/cancel return URLs
- Stripe
  - SecretKey: required; server‑side Stripe API key
  - WebhookSecret: required for `/webhooks/stripe` signature verification
  - WebhookToleranceMinutes: optional, default 5

Example: set secrets for local dev
```bash
# from this project directory
dotnet user-secrets set "Stripe:SecretKey" "sk_test_xxx"
dotnet user-secrets set "Stripe:WebhookSecret" "whsec_xxx"
dotnet user-secrets set "Frontend:PublicBaseUrl" "http://localhost:5173"
```

### Build and Run Scripts

#### Setup & Run
```bash
cd services/payment/PaymentService
dotnet restore
dotnet run  # http://localhost:5238
```

#### Docker Build
```bash
cd services/payment
docker build --secret id=GH_OWNER --secret id=GH_PAT -t restaurant-pos/payment-service:1.0.2 .
docker run -d -p 5238:5238 \
-e MongoDbSettings__ConnectionString="$cosmosDbString" \
-e ServiceBusSettings__ConnectionString="$serviceBusConnString" \
-e ServiceSettings__MessageBroker="SERVICEBUS" \
-e Stripe__SecretKey="$STRIPE_SECRET_KEY" \
-e Stripe__WebhookSecret="$STRIPE_WEBHOOK_SECRET" \
--network pos_pos-net \
--name payment-service-v1.0.2 \
restaurant-pos/payment-service:1.0.2
```

### 🐳 Build & Push Docker Image (ARM64 TO AMD64 THAT IS AKS Compatible)
export version=1.0.1
export ACR=acrpos

docker buildx build \
  --platform linux/amd64 \
  --secret id=GH_OWNER --secret id=GH_PAT \
  -t "$ACR.azurecr.io/pos.payment:$version" \
  --push .  

**Note**: The Docker build requires GitHub Personal Access Token with `read:packages` permission to access private NuGet packages.


## Create Kubernetes namespace 
```bash 
export namespace="payment"
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

### Manual Steps

#### Run
```bash
dotnet run
```
- Swagger UI: `/swagger` (Development only)
- Health: `/health/ready`, `/health/live`

## Webhooks (Dev)

Use Stripe CLI to forward events to your local service and to generate a valid signature. Replace `<payment-port>` with the port shown by `dotnet run`.

1) Start listener and note the printed signing secret (starts with `whsec_`):
```bash
stripe listen --forward-to https://localhost:<payment-port>/webhooks/stripe
```

2) Set the secret for local dev (only needed once per new secret):
```bash
dotnet user-secrets set "Stripe:WebhookSecret" "whsec_..."
```

3) Trigger a test event, e.g. Checkout session completed:
```bash
stripe trigger checkout.session.completed
```

You should see PaymentService log processing and, when appropriate, it publishes `PaymentSucceeded`.

Note: Manually POSTing to `/webhooks/stripe` with curl will fail signature verification unless you provide a valid `Stripe-Signature` header generated by Stripe. Prefer the Stripe CLI flow above.

## cURL Examples

- Create a Checkout Session
```bash
curl -X POST \
  https://localhost:<payment-port>/api/payments/stripe/checkout/session \
  -H 'Content-Type: application/json' \
  -d '{
        "amount": 2599,
        "currency": "usd",
        "orderId": "00000000-0000-0000-0000-000000000001",
        "description": "Test order #1"
      }'
```

- Confirm a Session (after redirect flow)
```bash
curl -X POST \
  "https://localhost:<payment-port>/api/payments/stripe/checkout/confirm?sessionId=cs_test_123"
```

- Poll for Order Payment Session URL
```bash
curl -X GET \
  https://localhost:<payment-port>/orders/00000000-0000-0000-0000-000000000001/payment-session
```

## API Overview

- Stripe (`/api/payments/stripe`)
  - `POST /api/payments/stripe/checkout/session` — create a Checkout Session; body: `{ amount, currency?, orderId?, description? }`
  - `POST /api/payments/stripe/checkout/confirm?sessionId=...` — confirm and fetch summary (status/amount/currency/receipt)

- Orders (`/orders`)
  - `GET /orders/{orderId}/payment-session` — returns `{ sessionUrl }` when ready, or `{ status }` for pending/succeeded/failed

- Webhooks
  - `POST /webhooks/stripe` — Stripe event handler; verifies signature via `Stripe:WebhookSecret` and updates payment status

Notes
- Tenancy is applied via `Common.Library.Tenancy`; payment entities include `RestaurantId` and `LocationId`.
- Webhook handler guards idempotency via `Payment.LastStripeEventId` and ignores duplicates.

## Messaging

- Consumes: `PaymentRequested` to create Stripe Checkout Session and persist `Payment` with `SessionUrl`
- Publishes:
  - `PaymentSessionCreated` after session creation (URL for frontend redirect)
  - `PaymentSucceeded` when Stripe indicates successful payment
  - `PaymentFailed` when Stripe indicates failure

## Project Layout
- `Program.cs` — DI for Mongo, Tenancy, MassTransit, Stripe configuration, CORS, Swagger
- `Controllers/` — Stripe API, webhook, and session query by order
- `Entities/` — `Payment` model (tenant‑scoped)
- `Settings/` — `StripeSettings`, `FrontendSettings`
- `Consumers/` — `PaymentRequestedConsumer`

---

License: Proprietary (internal project).
