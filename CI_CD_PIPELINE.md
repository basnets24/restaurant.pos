# CI/CD Pipeline Modernization Plan

## Overview

This document outlines the modernization of the Restaurant POS CI/CD pipeline from fragmented state to a standardized, automated system. The project is a personal project optimized for low cost with single AKS cluster, continuous deployment strategy, and Terraform infrastructure.

---

## Current State Assessment

### What's Working
- ✓ Frontend CI workflow (`frontend-ci.yml`) - builds and tests React app
- ✓ NuGet package publishing (3 workflows) - Common.Library, Messaging.Contracts, Tenant.Domain

### What's Broken / Missing
- ✗ **Zero CI/CD for 6 backend microservices** (identity, tenant, menu, inventory, order, payment)
- ✗ Docker images built but never pushed to registry
- ✗ 3 NuGet workflows are nearly identical (duplicated code)
- ✗ Hard-coded values in NuGet.config (owner name)
- ✗ No deployment automation to Azure
- ✗ Infrastructure only documented as manual CLI commands
- ✗ No linting/code quality enforcement
- ✗ Inconsistent secret naming and management

### Impact
- Developers can't validate backend changes on every PR
- Docker images aren't versioned or stored
- Manual Azure deployment is error-prone
- No visibility into code quality
- Long onboarding time for new infrastructure changes

---

## Strategic Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **Environments** | Single AKS cluster | Cost optimization for personal project |
| **Release Strategy** | Continuous deployment (SHA tags) | Fast iteration, no semantic versioning overhead |
| **IaC Tool** | Terraform | Industry standard, repeatable, version controlled |
| **Approval Model** | Manual approval on all deployments | Safety/control important for production |
| **Testing** | No automated tests for now | User preference - focus on standardization first |

---

## Implementation Roadmap

### Phase 1: Consolidation & Standardization (Week 1)

**Goal:** Clean up existing workflows, establish patterns

#### 1.1 Consolidate NuGet Publish Workflows
**Problem:** 3 nearly identical workflows for publishing NuGet packages
```
publish-common-library.yml       (50 lines)
publish-messaging-contracts.yml  (49 lines)
publish-tenant-domain.yml        (48 lines)
```

**Solution:**
- Create reusable workflow: `.github/workflows/publish-nuget-package.yml`
- Simplify 3 individual workflows to call the reusable one with parameters
- Inputs: `package_id`, `project_path`, `description`

#### 1.2 Fix Hard-Coded Values
**Problem:** NuGet.config hard-codes owner `basnets24`
```xml
<add key="github" value="https://nuget.pkg.github.com/basnets24/index.json" />
```

**Solution:**
- Use GitHub context variable: `${{ github.repository_owner }}`
- Update all workflow references to be consistent

#### 1.3 Create Secrets Documentation
**File:** `.github/SECRETS.md`

Document all required GitHub secrets:
```markdown
# GitHub Secrets Required

## GitHub Package Access
- GITHUB_OWNER - GitHub username/org (usually auto)
- GITHUB_PAT - Personal Access Token (scope: read:packages)

## Azure Credentials
- AZURE_SUBSCRIPTION_ID
- AZURE_TENANT_ID
- AZURE_CLIENT_ID (Service Principal)
- AZURE_CLIENT_SECRET (Service Principal)

## Azure Resources
- ACR_REGISTRY_URL - e.g., acrpos.azurecr.io
- ACR_USERNAME - Service Principal username
- ACR_PASSWORD - Service Principal password

## Deployment
- AKS_CLUSTER_NAME
- AKS_RESOURCE_GROUP
```

---

### Phase 2: Backend Service CI/CD (Week 1-2)

**Goal:** Every backend service builds and validates on every PR/commit

#### 2.1 Create Reusable Backend CI Workflow
**File:** `.github/workflows/backend-service-ci.yml`

This is a reusable workflow that all backend services will call with different parameters.

**Workflow Inputs:**
```yaml
inputs:
  service_name:
    required: true
    type: string  # identity, menu, inventory, order, payment, tenant
  project_path:
    required: true
    type: string  # services/[service]/src/[Service]Service/[Service]Service.csproj
  dockerfile_path:
    required: true
    type: string  # services/[service]
  health_check_port:
    required: true
    type: number  # 7163, 5062, etc.
```

**Workflow Steps:**
1. Checkout code
2. Setup .NET 8 SDK
3. Restore NuGet packages
   ```yaml
   - run: dotnet restore
     env:
       GH_OWNER: ${{ secrets.GITHUB_OWNER }}
       GH_PAT: ${{ secrets.GITHUB_PAT }}
   ```
4. Build project (Release configuration)
   ```yaml
   - run: dotnet build -c Release
   ```
5. Build Docker image
   ```yaml
   - run: |
       docker build \
         --secret id=GH_OWNER=${{ secrets.GITHUB_OWNER }} \
         --secret id=GH_PAT=${{ secrets.GITHUB_PAT }} \
         -t pos-${{ inputs.service_name }}:test .
   ```
6. Test Docker image health check
   ```yaml
   - run: |
       docker run -d -p 8080:${{ inputs.health_check_port }} \
         --name test-${{ inputs.service_name }} \
         pos-${{ inputs.service_name }}:test
       sleep 5
       curl -f http://localhost:8080/health || exit 1
   ```

#### 2.2 Create Individual Service Workflows
Create for each of the 6 services (identity, menu, inventory, order, payment, tenant):

**File:** `.github/workflows/[service]-ci.yml`

**Example for identity-ci.yml:**
```yaml
name: Identity Service CI

on:
  push:
    branches: [main, dev]
    paths:
      - 'services/identity/**'
      - '.github/workflows/identity-ci.yml'
  pull_request:
    branches: [main, dev]
    paths:
      - 'services/identity/**'
  workflow_dispatch:

jobs:
  build:
    uses: ./.github/workflows/backend-service-ci.yml
    with:
      service_name: identity
      project_path: services/identity/src/IdentityService/IdentityService.csproj
      dockerfile_path: services/identity
      health_check_port: 7163
    secrets: inherit
```

Repeat for all 6 services with appropriate ports and paths.

#### 2.3 Service Port Reference
| Service | Port | Protocol |
|---------|------|----------|
| Identity | 7163 | HTTPS |
| Menu | 5062 | HTTP |
| Inventory | 5094 | HTTP |
| Order | 5236 | HTTP |
| Payment | 5238 | HTTP |
| Tenant | 5200 | HTTP |

---

### Phase 3: Docker Registry & Image Push (Week 2)

**Goal:** All service images built and pushed to Azure Container Registry

#### 3.1 Setup ACR Credentials
Add to GitHub secrets:
- `ACR_REGISTRY_URL` - e.g., `acrpos.azurecr.io`
- `ACR_USERNAME` - Service Principal username
- `ACR_PASSWORD` - Service Principal password

#### 3.2 Update All Workflows to Push Images

Add to backend-service-ci.yml:
```yaml
- name: Login to ACR
  uses: docker/login-action@v2
  with:
    registry: ${{ secrets.ACR_REGISTRY_URL }}
    username: ${{ secrets.ACR_USERNAME }}
    password: ${{ secrets.ACR_PASSWORD }}

- name: Build and push Docker image
  uses: docker/build-push-action@v4
  with:
    context: ${{ inputs.dockerfile_path }}
    push: true
    tags: |
      ${{ secrets.ACR_REGISTRY_URL }}/pos-${{ inputs.service_name }}:latest
      ${{ secrets.ACR_REGISTRY_URL }}/pos-${{ inputs.service_name }}:${{ github.sha }}
    secrets: |
      GH_OWNER=${{ secrets.GITHUB_OWNER }}
      GH_PAT=${{ secrets.GITHUB_PAT }}
```

Also update frontend-ci.yml to push images:
```yaml
- name: Build and push frontend image
  uses: docker/build-push-action@v4
  with:
    context: services/frontend
    push: true
    tags: |
      ${{ secrets.ACR_REGISTRY_URL }}/pos-frontend:latest
      ${{ secrets.ACR_REGISTRY_URL }}/pos-frontend:${{ github.sha }}
```

#### 3.3 Image Naming Convention
```
[registry-url]/pos-[service-name]:[tag]

Examples:
  acrpos.azurecr.io/pos-identity:latest
  acrpos.azurecr.io/pos-identity:abc123def456
  acrpos.azurecr.io/pos-menu:latest
  acrpos.azurecr.io/pos-frontend:latest
```

Tags:
- `latest` - Latest build from main/dev
- `[commit-sha]` - Immutable version per commit (e.g., `abc123def456`)
- Optional: semver tags for releases (e.g., `v1.0.0`)

---

### Phase 4: Code Quality & Linting (Week 2)

**Goal:** Enforce code standards before merge

#### 4.1 Frontend Linting
Update `.github/workflows/frontend-ci.yml`:
```yaml
- name: ESLint
  run: npm run lint

- name: Prettier (Format Check)
  run: npm run format:check
```

#### 4.2 Backend Code Quality
Add to backend-service-ci.yml:
```yaml
- name: Code Style (StyleCop)
  run: dotnet build -c Release /p:EnforceCodeStyleInBuild=true
```

---

### Phase 5: Infrastructure as Code with Terraform (Week 3)

**Goal:** Repeatable, version-controlled infrastructure

#### 5.1 Create Terraform Configuration
**Directory:** `infra/terraform/`

**Files to create:**

**main.tf** - Azure resources
```hcl
terraform {
  required_version = ">= 1.0"
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.0"
    }
  }
  backend "azurerm" {
    # Configured via backend config file or env vars
  }
}

provider "azurerm" {
  features {}
}

# Resource Group
resource "azurerm_resource_group" "main" {
  name     = var.resource_group_name
  location = var.location
}

# AKS Cluster
resource "azurerm_kubernetes_cluster" "main" {
  name                = var.aks_cluster_name
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  dns_prefix          = var.aks_cluster_name
  
  default_node_pool {
    name       = "default"
    node_count = 1
    vm_size    = "Standard_B2s"  # Cost-optimized for personal project
  }
  
  identity {
    type = "SystemAssigned"
  }
}

# Azure Container Registry
resource "azurerm_container_registry" "main" {
  name                = var.acr_name
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  sku                 = "Basic"
  admin_enabled       = true
}

# PostgreSQL Database
resource "azurerm_postgresql_server" "main" {
  name                = var.postgres_server_name
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  # ... configuration
}

# Service Bus Namespace
resource "azurerm_servicebus_namespace" "main" {
  name                = var.servicebus_namespace_name
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  sku                 = "Standard"
}

# Azure Key Vault
resource "azurerm_key_vault" "main" {
  name                = var.keyvault_name
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  sku_name            = "standard"
  # ... configuration
}
```

**variables.tf** - Input variables
```hcl
variable "subscription_id" {
  type        = string
  description = "Azure Subscription ID"
}

variable "location" {
  type        = string
  default     = "westus"
  description = "Azure region"
}

variable "resource_group_name" {
  type        = string
  description = "Resource group name"
}

variable "aks_cluster_name" {
  type        = string
  description = "AKS cluster name"
}

variable "acr_name" {
  type        = string
  description = "Container Registry name"
}

# ... more variables
```

**outputs.tf** - Export values
```hcl
output "acr_registry_url" {
  value       = azurerm_container_registry.main.login_server
  description = "ACR registry URL for Docker push/pull"
}

output "aks_cluster_name" {
  value       = azurerm_kubernetes_cluster.main.name
  description = "AKS cluster name"
}

output "aks_resource_group" {
  value       = azurerm_resource_group.main.name
  description = "Resource group containing AKS"
}

output "servicebus_connection_string" {
  value       = azurerm_servicebus_namespace.main.default_primary_connection_string
  sensitive   = true
}
```

**terraform.tfvars** - Variables for personal project
```hcl
subscription_id        = "your-subscription-id"
location               = "westus"
resource_group_name    = "restaurant-pos-rg"
aks_cluster_name       = "restaurant-pos-aks"
acr_name               = "restaurantposacr"
postgres_server_name   = "restaurant-pos-postgres"
servicebus_namespace_name = "restaurant-pos-sb"
keyvault_name          = "restaurant-pos-kv"
```

**backend.tf** - State management
```hcl
terraform {
  backend "azurerm" {
    resource_group_name  = "terraform-state-rg"
    storage_account_name = "tfstatesa"
    container_name       = "tfstate"
    key                  = "restaurant-pos.tfstate"
  }
}
```

#### 5.2 Infrastructure Provisioning Workflow
**File:** `.github/workflows/azure-infra-provision.yml`

```yaml
name: Azure Infrastructure Provisioning

on:
  workflow_dispatch:
  push:
    branches: [main]
    paths:
      - 'infra/terraform/**'

jobs:
  terraform:
    runs-on: ubuntu-latest
    env:
      ARM_CLIENT_ID: ${{ secrets.AZURE_CLIENT_ID }}
      ARM_CLIENT_SECRET: ${{ secrets.AZURE_CLIENT_SECRET }}
      ARM_SUBSCRIPTION_ID: ${{ secrets.AZURE_SUBSCRIPTION_ID }}
      ARM_TENANT_ID: ${{ secrets.AZURE_TENANT_ID }}
    
    steps:
      - uses: actions/checkout@v4
      
      - uses: hashicorp/setup-terraform@v2
        with:
          terraform_version: 1.5.0
      
      - name: Terraform Init
        run: |
          cd infra/terraform
          terraform init \
            -backend-config="resource_group_name=${{ secrets.TF_STATE_RG }}" \
            -backend-config="storage_account_name=${{ secrets.TF_STATE_SA }}" \
            -backend-config="container_name=tfstate" \
            -backend-config="key=restaurant-pos.tfstate"
      
      - name: Terraform Validate
        run: |
          cd infra/terraform
          terraform validate
      
      - name: Terraform Plan
        run: |
          cd infra/terraform
          terraform plan -out=tfplan
      
      - name: Terraform Apply
        if: github.event_name == 'push' && github.ref == 'refs/heads/main'
        run: |
          cd infra/terraform
          terraform apply -auto-approve tfplan
```

---

### Phase 6: Kubernetes Deployment Pipeline (Week 3-4)

**Goal:** Automated deployment to AKS

#### 6.1 Kubernetes Deployment Workflow
**File:** `.github/workflows/azure-deploy-aks.yml`

```yaml
name: Deploy to AKS

on:
  workflow_run:
    workflows:
      - "Identity Service CI"
      - "Menu Service CI"
      - "Inventory Service CI"
      - "Order Service CI"
      - "Payment Service CI"
      - "Tenant Service CI"
      - "Frontend CI"
    types: [completed]
    branches: [main, dev]
  workflow_dispatch:

concurrency: deploy-${{ github.ref }}

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment:
      name: production
      # Manual approval required before deployment
    
    env:
      ARM_CLIENT_ID: ${{ secrets.AZURE_CLIENT_ID }}
      ARM_CLIENT_SECRET: ${{ secrets.AZURE_CLIENT_SECRET }}
      ARM_SUBSCRIPTION_ID: ${{ secrets.AZURE_SUBSCRIPTION_ID }}
      ARM_TENANT_ID: ${{ secrets.AZURE_TENANT_ID }}
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Get AKS credentials
        run: |
          az login --service-principal \
            -u ${{ env.ARM_CLIENT_ID }} \
            -p ${{ env.ARM_CLIENT_SECRET }} \
            --tenant ${{ env.ARM_TENANT_ID }}
          
          az aks get-credentials \
            --resource-group ${{ secrets.AKS_RESOURCE_GROUP }} \
            --name ${{ secrets.AKS_CLUSTER_NAME }}
      
      - name: Setup Helm
        uses: azure/setup-helm@v3
        with:
          version: 'v3.12.0'
      
      - name: Validate Helm Charts
        run: |
          helm lint infra/helm/microservice
      
      - name: Deploy Services with Helm
        run: |
          NAMESPACE=production
          COMMIT_SHA=${{ github.sha }}
          ACR_URL=${{ secrets.ACR_REGISTRY_URL }}
          
          # Ensure namespace exists
          kubectl create namespace $NAMESPACE --dry-run=client -o yaml | kubectl apply -f -
          
          # Deploy each service
          for SERVICE in identity menu inventory order payment tenant; do
            helm upgrade $SERVICE infra/helm/microservice \
              -f infra/helm/values.yaml \
              --set image.repository=$ACR_URL/pos-$SERVICE \
              --set image.tag=$COMMIT_SHA \
              --namespace $NAMESPACE \
              --create-namespace \
              --install
          done
          
          # Deploy frontend
          helm upgrade frontend infra/helm/microservice \
            -f infra/helm/values.yaml \
            --set image.repository=$ACR_URL/pos-frontend \
            --set image.tag=$COMMIT_SHA \
            --namespace $NAMESPACE \
            --create-namespace \
            --install
      
      - name: Wait for rollout
        run: |
          kubectl rollout status deployment -l app=pos \
            -n production \
            --timeout=5m
      
      - name: Run smoke tests
        run: |
          # Simple HTTP health checks
          kubectl run smoketest --image=curlimages/curl \
            --rm -i --restart=Never -- \
            curl -f http://pos-frontend.production.svc.cluster.local || exit 1
```

#### 6.2 Helm Configuration for Production
Update `infra/helm/microservice/values.yaml` with environment-specific overrides.

**New file:** `infra/helm/values-prod.yaml`
```yaml
replicaCount: 2
resources:
  limits:
    cpu: 500m
    memory: 512Mi
  requests:
    cpu: 250m
    memory: 256Mi
autoscaling:
  enabled: true
  minReplicas: 2
  maxReplicas: 5
```

---

## Files to Create/Modify

### New Files

#### Reusable Workflows
- `.github/workflows/backend-service-ci.yml`
- `.github/workflows/publish-nuget-package.yml`

#### Individual Service CI Workflows
- `.github/workflows/identity-ci.yml`
- `.github/workflows/menu-ci.yml`
- `.github/workflows/inventory-ci.yml`
- `.github/workflows/order-ci.yml`
- `.github/workflows/payment-ci.yml`
- `.github/workflows/tenant-ci.yml`

#### Deployment Workflows
- `.github/workflows/azure-infra-provision.yml`
- `.github/workflows/azure-deploy-aks.yml`

#### Documentation
- `.github/SECRETS.md` - Required GitHub secrets and their purpose
- `.github/WORKFLOWS.md` - How to add services, troubleshoot, architecture

#### Terraform Infrastructure
- `infra/terraform/main.tf`
- `infra/terraform/variables.tf`
- `infra/terraform/outputs.tf`
- `infra/terraform/terraform.tfvars`
- `infra/terraform/backend.tf`
- `infra/terraform/.gitignore` (exclude .tfvars with secrets)

#### Helm Configuration
- `infra/helm/values-prod.yaml`

### Modified Files

#### Consolidate Existing Workflows
- `.github/workflows/publish-common-library.yml` (simplify to call reusable)
- `.github/workflows/publish-messaging-contracts.yml` (simplify to call reusable)
- `.github/workflows/publish-tenant-domain.yml` (simplify to call reusable)

#### Enhance Existing Workflows
- `.github/workflows/frontend-ci.yml` (add linting, add image push)

#### Configuration
- `NuGet.config` (remove hard-coded owner, use variable)

#### Documentation
- `README.md` (add CI/CD overview section)
- `infra/README.md` (update with Terraform and automated deployment)

---

## Implementation Phases Timeline

### Week 1: Foundation
- [ ] Phase 1: Consolidate & standardize existing workflows
- [ ] Phase 2: Create backend service CI/CD for all 6 services

**Deliverable:** Every service builds on every PR

### Week 2: Registry & Quality
- [ ] Phase 3: Docker image push to ACR
- [ ] Phase 4: Code quality & linting

**Deliverable:** All images in registry, code quality enforced

### Week 3-4: Deployment
- [ ] Phase 5: Terraform infrastructure as code
- [ ] Phase 6: AKS deployment pipeline

**Deliverable:** Fully automated infrastructure and deployment

---

## Success Criteria

✓ Every service has consistent CI/CD pattern  
✓ All 7 services + frontend build on every PR  
✓ No duplicate workflow code (DRY principle)  
✓ All secrets properly named and documented  
✓ Docker images versioned and pushed to ACR  
✓ Code quality checks enforced before merge  
✓ Infrastructure defined as code (Terraform)  
✓ Automated deployment to AKS  
✓ No manual CLI commands needed  
✓ Developer can add new service by copying workflow file and updating parameters

---

## Quick Reference: Adding a New Service

Once standardized, adding a new backend service is simple:

1. **Create workflow file:** `.github/workflows/[newservice]-ci.yml`
   ```yaml
   uses: ./.github/workflows/backend-service-ci.yml
   with:
     service_name: newservice
     project_path: services/newservice/src/NewService/NewService.csproj
     dockerfile_path: services/newservice
     health_check_port: 5XXX
   ```

2. **Update Helm deployment:** Add line to azure-deploy-aks.yml
   ```bash
   helm upgrade newservice ...
   ```

3. **Done!** Service automatically:
   - Builds on every PR
   - Builds Docker image
   - Pushes to ACR
   - Gets deployed to AKS

---

## Troubleshooting

### Workflow won't trigger
- Check path filters match your file changes
- Verify branch is main or dev
- Check workflow file syntax (use `github.com/[owner]/[repo]/actions`)

### Docker build fails
- Check `GH_OWNER` and `GH_PAT` secrets are set
- Verify NuGet.config references correct registry
- Run `dotnet restore` locally to test

### Terraform state error
- Ensure backend storage account and container exist in Azure
- Verify service principal has storage access
- Check `terraform.tfvars` has correct values

### AKS deployment fails
- Verify ACR login credentials are correct
- Check Helm chart syntax with `helm lint`
- Verify Docker images exist in ACR registry
- Check pod logs: `kubectl logs -n production [pod-name]`

---

## References

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Terraform Azure Provider](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs)
- [Helm Package Manager](https://helm.sh/docs/)
- [Azure Kubernetes Service](https://learn.microsoft.com/en-us/azure/aks/)
