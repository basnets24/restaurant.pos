# PaymentService (Restaurant POS)

Payment orchestration for the Restaurant POS platform. Creates a Stripe **PaymentIntent** when the order service asks for payment, hands the client secret to the frontend, and verifies the result server-side once the browser confirms. Built with .NET 10, PostgreSQL/EF Core, MassTransit/RabbitMQ, and Stripe.net.

Confirmation is synchronous and server-side. There is no webhook endpoint and no Stripe Checkout Session — adding either would be new work, not a config toggle.

## How payment flows

1. The order service publishes `PaymentRequested` (from `OrderController.RequestPayment` — deliberately **outside** the order saga; see the repo-root `CLAUDE.md`).
2. `PaymentRequestedConsumer` creates a Stripe PaymentIntent with `AutomaticPaymentMethods` enabled, persists a `Payment` row, and publishes `PaymentSessionCreated` carrying the intent's **client secret**.
3. The frontend polls `GET /orders/{orderId}/payment-session` until the client secret is available, then confirms it in-browser with an embedded Stripe `PaymentElement` (`StripeCheckoutDialog`). No redirect to a Stripe-hosted page.
4. The frontend then calls `POST /orders/{orderId}/payment-confirm`. That endpoint re-fetches the PaymentIntent from Stripe — it never trusts the browser's claim — and publishes `PaymentSucceeded` or `PaymentFailed` synchronously.

Intent states other than `succeeded`/`canceled`/`requires_payment_method` (e.g. `processing`, `requires_action`) return `{ status: "pending" }` and are expected to be polled again.

**Idempotency / retries.** One `Payment` row per `OrderId`. A `PaymentRequested` for an already-succeeded order is logged and ignored. Retrying a *failed* payment reuses the row and resets the attempt-scoped fields (`Status`, `ErrorMessage`) before minting a fresh intent, so a previous decline doesn't leak into the new attempt.

## Features
- Tenant-scoped payment records in PostgreSQL (`RestaurantId`/`LocationId` via `Common.Library.Tenancy`)
- Stripe PaymentIntent creation + server-side confirmation
- Messaging integration with the order workflow
  - Consumes: `PaymentRequested`
  - Publishes: `PaymentSessionCreated`, `PaymentSucceeded`, `PaymentFailed`
- JWT bearer auth with scope-based policies, CORS for the frontend, Swagger in Development, health endpoints, OpenTelemetry traces/metrics

## API

Both endpoints live under `/orders` and require the `payment.read` scope.

| Method | Route | Behavior |
|---|---|---|
| `GET` | `/orders/{orderId}/payment-session` | `200 { clientSecret }` when ready · `200 { status: "succeeded" \| "failed" }` when already resolved · `202 { status: "pending" }` when the row exists but has no client secret yet · `404 { status: "pending" }` when no payment row exists yet |
| `POST` | `/orders/{orderId}/payment-confirm` | Verifies the PaymentIntent with Stripe, updates the row, publishes `PaymentSucceeded`/`PaymentFailed`. Returns `{ status, receiptUrl }` or `{ status, error }` |

Also exposed: `/swagger` (Development only), `/health/ready`, `/health/live`, and a Prometheus scraping endpoint.

`PaymentPolicyExtensions` additionally defines `PaymentCharge` (`payment.charge`) and `PaymentRefund` (`payment.refund`) policies with role requirements. **Neither is currently applied to any endpoint** — there is no refund flow yet. They're scaffolding for one.

## Getting Started

### Prerequisites
- .NET SDK 10.0+
- PostgreSQL and RabbitMQ (both come from `infra/docker-compose.yml`)
- A Stripe account and a **test-mode secret key**

Normally you don't run this service by hand — `./scripts/dev.sh` from the repo root starts infra plus all four services and the frontend.

### Configuration

Bound from `appsettings.json`, environment variables, or User Secrets. Note the config section is **`StripeSettings`**, not `Stripe`:

```bash
# from services/payment/PaymentService
dotnet user-secrets set "StripeSettings:SecretKey" "sk_test_xxx"
```

Or via the repo-root `.env` (what `scripts/dev.sh` reads):

```
StripeSettings__SecretKey=sk_test_xxx
```

`StripeSettings` has exactly one property — `SecretKey`. Startup throws if it's blank.

Other sections: `ServiceSettings` (`Authority` — the identity service, used for JWT validation), `PostgresSettings`, `RabbitMqSettings`, `SeqSettings`, `JaegerSettings`, `Cors:AllowedOrigins`.

### Run standalone
```bash
dotnet run --project services/payment/PaymentService  # https://localhost:7182 / http://localhost:5238
```

## Testing payments locally

Use a [Stripe test card](https://docs.stripe.com/testing) (`4242 4242 4242 4242`, any future expiry, any CVC, any ZIP) in the embedded payment form. The Stripe CLI is **not** needed — nothing here listens for forwarded events.

The repo's Playwright suite covers this end to end in `services/frontend/e2e/payment.spec.ts`; see `services/frontend/CLAUDE.md` for the Payment Element iframe gotchas before touching it.

## Project Layout
- `Program.cs` — DI for Postgres/EF Core, tenancy, MassTransit, Stripe client, auth policies, CORS, Swagger, OpenTelemetry
- `Controllers/PaymentSessionController.cs` — the two endpoints above
- `Consumers/PaymentRequestedConsumer.cs` — creates the PaymentIntent
- `Entities/Payment.cs` — tenant-scoped payment record (`PaymentIntentId`, `ClientSecret`, `ReceiptUrl`, `ErrorMessage`, `Status`)
- `Auth/PaymentPolicyExtensions.cs` — scope/role policies
- `Settings/StripeSettings.cs` — just `SecretKey`
- `Data/` — `PaymentDbContext` (+ design-time factory), `Migrations/`
- `Metrics/PaymentMetrics.cs` — success/failure counters

## Deployment

Container images and Helm charts follow the same pattern as the other services; the shared chart lives in `infra/helm/microservice/`. The Docker build needs a GitHub PAT with `read:packages` to restore the private `Common.Library`/`Messaging.Contracts` NuGet packages.

```bash
# AKS is amd64; build cross-platform from an ARM Mac
export version=1.0.2
export ACR=acrpos

docker buildx build \
  --platform linux/amd64 \
  --secret id=GH_OWNER --secret id=GH_PAT \
  -t "$ACR.azurecr.io/pos.payment:$version" \
  --push .
```

```bash
# namespace + workload identity + Key Vault access
export namespace="payment"
kubectl create namespace $namespace

az identity create --resource-group $RG --name $namespace
export IDENTITY_CLIENT_ID=$(az identity show -g "$RG" -n "$namespace" --query clientId -o tsv)
export SUBSCRIPTION_ID=$(az account show --query id -o tsv)

az role assignment create \
  --assignee "$IDENTITY_CLIENT_ID" \
  --role "Key Vault Secrets User" \
  --scope "/subscriptions/$SUBSCRIPTION_ID/resourceGroups/$RG/providers/Microsoft.KeyVault/vaults/$KV"

export AKS_OIDC_ISSUER="$(az aks show -n $AKS -g $RG --query "oidcIssuerProfile.issuerUrl" -otsv)"
az identity federated-credential create \
  --name ${namespace} --identity-name "${namespace}" --resource-group "${RG}" \
  --issuer "${AKS_OIDC_ISSUER}" \
  --subject system:serviceaccount:"${namespace}":"${namespace}-serviceaccount" \
  --audience api://AzureADTokenExchange
```

```bash
# install/upgrade the chart
helmUser="00000000-0000-0000-0000-000000000000"
helmPassword=$(az acr login --name $ACR --expose-token --output tsv --query accessToken)
helm registry login $ACR.azurecr.io --username $helmUser --password $helmPassword

chartVersion="0.1.1"
helm upgrade pos-$namespace-service oci://$ACR.azurecr.io/helm/pos-microservice \
  --version $chartVersion -f ./helm/values.yaml -n $namespace --install
```

---

License: Proprietary (internal project).
