# Infrastructure

Infrastructure for the Restaurant POS platform — local Docker Compose stack for development, and the Azure/AKS bootstrap for deployment.

## Layout

| Path | What it is |
|---|---|
| `docker-compose.yml` | The local dev stack (see below) |
| `prometheus/`, `grafana/`, `jaeger/` | Observability config consumed by that stack |
| `helm/microservice/` | Shared Helm chart; each service's own `helm/values.yaml` feeds it |
| `emissary-ingress/` | `listener.yaml`, `mappings.yaml`, `host.yaml`, `tls-certificate.yaml` |
| `cert-manager/` | `cluster-issuer.yaml`, `acme-challenge.yaml` |
| `terraform/` | **Empty** — only a `.gitignore` is tracked. The Azure CLI bootstrap below is the current path. |

Note that **Postgres is not provisioned here**. Deployed environments use Supabase (schema-per-service, Supavisor **session-mode** pooling on port `5432` — transaction mode on `6543` breaks EF Core's migration batches); locally it's the compose container.

---

## Local development

This is what you use day to day. From the **repo root**:

```bash
./scripts/dev.sh
```

That brings up the compose stack, waits for it to be healthy, then runs all four .NET services and the frontend directly via `dotnet run` / `npm run dev`. Only infrastructure is containerized locally — don't try to `docker compose up` the services themselves.

To start just the infrastructure:

```bash
docker compose -f infra/docker-compose.yml up -d
```

Six containers, all defined in `docker-compose.yml`:

| Container | URL | Purpose |
|---|---|---|
| postgres | `localhost:5432` | All service data, schema-per-service |
| rabbitmq | http://localhost:15672 | Message broker + management UI |
| seq | http://localhost:5341 | Structured logs |
| jaeger | http://localhost:16686 | Distributed traces |
| prometheus | http://localhost:9090 | Metrics scraping |
| grafana | http://localhost:3000 | Dashboards |

`scripts/dev.sh` only health-waits on postgres, rabbitmq, and seq — the observability three come up alongside but aren't gated on. `./scripts/dev.sh stop` stops the services the script started and leaves these containers running.

---

## Azure / AKS bootstrap

One-time setup for a deployed environment. Set these first:

```bash
export owner=[GITHUB-PERSONAL-OR-ORG-NAME]
export gh_pat=[YOUR_PERSONAL_ACCESS_TOKEN]
export RG=[RESOURCE-GROUP-NAME-HERE]
export SB=[SERVICE-BUS-HERE]
export ACR=[CONTAINER-REGISTRY-HERE]
export AKS=[AKS-NAME-HERE]
export KV=[KEY-VAULT-NAME]
```

### Add the GitHub Packages NuGet source

Needed to restore the private `Common.Library`, `Messaging.Contracts`, and `Tenant.Domain` packages. The PAT needs `read:packages`.

```bash
dotnet nuget add source \
  --username "$owner" \
  --password "$gh_pat" \
  --store-password-in-clear-text \
  --name github \
  "https://nuget.pkg.github.com/$owner/index.json"
```

### Create the Azure resources

```bash
az group create --name $RG --location westus

az servicebus namespace create --name $SB --resource-group $RG --sku Standard

az acr create --name $ACR --resource-group $RG --sku Basic

az aks create -n $AKS -g $RG --node-vm-size Standard_B2s --node-count 2 --attach-acr $ACR \
   --enable-oidc-issuer --enable-workload-identity --generate-ssh-keys

az aks get-credentials --name $AKS --resource-group $RG

az keyvault create -n $KV -g $RG
```

### Install Emissary Ingress

```bash
helm repo add datawire https://app.getambassador.io
helm repo update

kubectl create namespace emissary && \
kubectl apply -f https://app.getambassador.io/yaml/emissary/3.9.1/emissary-crds.yaml

kubectl wait --timeout=90s --for=condition=available deployment emissary-apiext -n emissary-system

export appname=spoontab
export namespace=emissary
helm install emissary-ingress datawire/emissary-ingress \
  --set service.annotations."service\.beta\.kubernetes\.io/azure-dns-label-name"=$appname \
  --namespace $namespace && \
kubectl -n $namespace wait --for condition=available --timeout=90s deploy -lapp.kubernetes.io/instance=emissary-ingress

kubectl rollout status deployment/emissary-ingress -n $namespace -w
kubectl get svc -w --namespace emissary emissary-ingress
```

### Configure routing

```bash
kubectl apply -f ./emissary-ingress/listener.yaml -n $namespace
kubectl apply -f ./emissary-ingress/mappings.yaml -n $namespace
```

### Install cert-manager

```bash
helm repo add jetstack https://charts.jetstack.io --force-update

helm install \
  cert-manager jetstack/cert-manager \
  --namespace $namespace \
  --version v1.18.2 \
  --set crds.enabled=true
```

### Create the cluster issuer

```bash
kubectl apply -f ./cert-manager/cluster-issuer.yaml -n "$namespace"
kubectl apply -f ./cert-manager/acme-challenge.yaml -n "$namespace"
```

### Enable TLS and HTTPS

```bash
kubectl apply -f ./emissary-ingress/tls-certificate.yaml -n "$namespace"
kubectl apply -f ./emissary-ingress/host.yaml -n "$namespace"
```

### Package and publish the shared microservice chart

Each service's `helm/values.yaml` is applied against this one shared chart.

```bash
helm package ./helm/microservice

helmUser="00000000-0000-0000-0000-000000000000"
helmPassword=$(az acr login --name $ACR --expose-token --output tsv --query accessToken)
helm registry login $ACR.azurecr.io --username $helmUser --password $helmPassword

version=0.1.1
helmchart=pos-microservice
helm push $helmchart-$version.tgz oci://$ACR.azurecr.io/helm
```

Per-service install steps (namespace, managed identity, federated credential, `helm upgrade --install`) live in each service's own README — see `services/payment/README.md` for the pattern.
