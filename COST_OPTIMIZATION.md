# Cost Optimization Plan

Reduce monthly Azure costs by **22-25% ($30-50/month)** with quick wins, plus additional **$10-20/month** through architectural improvements.

---

## Current vs Optimized Costs

### Breakdown by Component

| Component | Current | Optimized | Savings |
|-----------|---------|-----------|---------|
| **AKS (Kubernetes)** | $60-80 | $30-40 | **-$30-40** |
| Service Bus (Standard) | $15-20 | $10-15 | -$5 (optional) |
| ACR (Container Registry) | $5-10 | $5-10 | - |
| PostgreSQL | $30-50 | $30-40 | -$0-10 |
| Storage | $5-10 | $5-10 | - |
| Load Balancer/NAT | $15-20 | $15-20 | - |
| Monitoring (pods) | $5-10 | $5-10 | - |
| **Monthly Total** | **$135-200** | **$105-150** | **-$30-50 (22-25%)** |

**Annual Savings: $360-600/year from quick wins alone**

---

## Implementation Roadmap

### Phase 1: Quick Wins (30 minutes - Save $30-40/month)

#### 1.1 Reduce AKS Node Count: 2 → 1
**Impact:** -$30-40/month (biggest savings)

**Why:** You're running dev/personal project. Single node is acceptable with pod placement tolerance.

**Current Configuration:**
```bash
# infra/README.md line 48
az aks create -n $AKS -g $RG --node-vm-size Standard_B2s --node-count 2
```

**Change to:**
```bash
az aks create -n $AKS -g $RG --node-vm-size Standard_B2s --node-count 1
```

**File to update:** `infra/README.md`

**Verification:**
```bash
kubectl get nodes
# Should show 1 node instead of 2
```

**Risk Mitigation:**
- Single point of failure: Acceptable for personal project
- Downtime during updates: Minimal (pod eviction won't work with 1 node, but acceptable)
- Recovery: Can scale back to 2 nodes if needed

---

#### 1.2 Right-Size Pod Resource Limits
**Impact:** -$5-10/month (indirect benefit through better packing)

**Current State:**
- 7 services with resource limits spread across 8GB (2 × 4GB nodes)
- Current utilization: ~22.5% (over-provisioned)

**Optimization:**

**File:** `infra/helm/microservice/values.yaml`

**Update CPU limits:**
```yaml
# Before
resources:
  limits:
    cpu: 150m      # Conservative
  requests:
    cpu: 75m

# After
resources:
  limits:
    cpu: 100m      # Reduced headroom
  requests:
    cpu: 50m
```

**Apply per service basis:**
- **Identity:** Keep at 150m limit (auth critical path)
- **Frontend:** Reduce from 150m to 100m (static content)
- **Menu/Inventory/Tenant:** Reduce from 150m to 100m
- **Order:** Reduce from 400m to 250m (complex, but not peak traffic)
- **Payment:** Reduce from 150m to 100m

**Memory settings:**
- Keep requests: 128-256Mi (already reasonable)
- Reduce limits by 10-15%: 256Mi → 220Mi, 400Mi → 350Mi

**Verification:**
```bash
kubectl describe nodes
# Check allocated resources vs. actual usage
```

---

### Phase 2: Medium Effort (1-2 hours - Save additional $10-20/month)

#### 2.1 Verify & Optimize PostgreSQL Tier
**Impact:** -$10-20/month if downgrading

**Current:** Not documented (assumed General Purpose or Standard)

**Action:** Check Azure portal PostgreSQL server → Pricing tier

**Optimization options:**
- **General Purpose (B2s, 32GB):** ~$50-60/month → **Change to Basic (B1s, 5GB)**
- **Basic (B1s, 5GB):** ~$30-40/month

**Sufficient for personal project:** Yes
- Identity database: Only user/tenant/role data
- Tenant database: Minimal operational data
- Traffic: Low-to-moderate

**File to update:** Will be in Terraform once CI/CD pipeline implemented

```hcl
# When implementing Terraform (see CI_CD_PIPELINE.md)
resource "azurerm_postgresql_server" "main" {
  sku_name = "B_Gen5_1"  # Basic tier (was B_Gen5_2 or higher)
}
```

---

#### 2.2 Implement ACR Image Cleanup Policy
**Impact:** Prevents upgrade to Premium tier ($50/month additional cost)

**Current:** Basic SKU with 10GB storage limit
- 7 services × multiple versions = high storage consumption
- Risk: Exceeding 10GB → forced upgrade to Standard ($10/month) or Premium

**Solution:** Configure image retention policy

**Configure in Azure Portal or CLI:**
```bash
az acr config retention update \
  --registry $ACR \
  --status enabled \
  --days 30 \
  --untagged-manifests-enabled true
```

**Effect:**
- Keep only images from last 30 days
- Remove untagged images immediately
- Prevents storage overflow
- Typical cleanup: 50% reduction in storage

---

#### 2.3 Optimize Service Bus (Optional - Save $5/month)
**Impact:** -$5/month if switching to Basic tier

**Current:** Standard SKU (~$15-20/month)

**Action:** Monitor actual messaging volume
- Check Service Bus metrics in Azure portal
- If <1M operations/month: downgrade to Basic ($10/month)

**Check command:**
```bash
az servicebus namespace show --name $SB --resource-group $RG --query sku
```

**Switch to Basic:**
```bash
# Will require downtime
az servicebus namespace update \
  --name $SB \
  --resource-group $RG \
  --sku Basic
```

**Trade-offs:**
- Basic: No partitioning, max 1GB messages/day
- Standard: Partitioning, 80GB messages/day
- For personal project: Basic is sufficient

---

### Phase 3: Architectural Changes (Planning - Save $15-30/month long-term)

#### 3.1 Separate Dev/Production Environments
**Impact:** -$45-70/month if dev on cheap SKU

**Approach:**
- **Dev/Staging:** 1 × Standard_B1s ($10-15/month)
- **Production:** 1 × Standard_B2s ($30-40/month)
- Separate databases and registries

**Implementation:**
- Create separate Terraform modules for dev vs prod
- Different GitHub deployment workflows
- CI/CD deploys to dev on PR merge, prod on release tag

**Cost breakdown:**
- Current: 1 × B2s = $30-40/month (after Phase 1)
- With prod separation: B2s prod ($30-40) + B1s dev ($10-15) = $40-55
- Net: Similar cost but better resource isolation

---

#### 3.2 Implement Remote Prometheus Storage
**Impact:** -$2-5/month + better retention

**Current Plan (from MONITORING.md):**
- Prometheus: 15-day retention, 5GB persistent volume
- Volume storage: ~$10-15/month

**Optimization:**
```yaml
# In Prometheus deployment
remoteWrite:
  - url: https://[storage-account].blob.core.windows.net/prometheus/
    writeRelabelConfigs:
      - sourceLabels: [__name__]
        regex: 'container_memory_usage_bytes|http_requests_total'
        action: keep
```

**Cost comparison:**
- Azure Blob Storage (Cool tier): $0.018/GB/month
- Local persistent volume: $2.50/GB/month
- 5GB: $0.09/month vs $12.50/month
- **Savings: $12/month + better archival**

**Trade-off:** Slightly more complex Prometheus configuration

---

## Implementation Checklist

### Week 1: Quick Wins (Immediate - 30 min)

- [ ] **Reduce AKS nodes to 1**
  - Edit `infra/README.md` line 48
  - Change `--node-count 2` to `--node-count 1`
  - Or run: `az aks scale -n $AKS -g $RG --node-count 1`

- [ ] **Right-size pod limits**
  - Edit `infra/helm/microservice/values.yaml`
  - Reduce CPU limits: 150m → 100m
  - Reduce memory limits by 10-15%

- [ ] **Verify current PostgreSQL tier**
  - Check Azure portal PostgreSQL → Pricing tier
  - Note current SKU for potential downgrade

### Month 1: Medium Effort (1-2 hours)

- [ ] **Set up ACR image cleanup**
  - Configure 30-day retention policy in Azure Portal
  - Or run provided CLI command

- [ ] **Check Service Bus usage**
  - View metrics in Azure portal
  - Determine if downgrade to Basic is safe

- [ ] **Plan PostgreSQL downgrade**
  - If General Purpose: Prepare downgrade steps
  - Schedule maintenance window
  - Update Terraform configuration (when implemented)

### Month 2-3: Architectural

- [ ] **Plan dev/prod separation**
  - Design separate Terraform modules
  - Plan GitHub workflow changes
  - Estimate resource allocation

- [ ] **Implement Prometheus remote storage**
  - Research Azure Blob Storage configuration
  - Update MONITORING.md with implementation
  - Test configuration before production

---

## By-The-Numbers Savings

### Scenario 1: Quick Wins Only (Phase 1)
- **Effort:** 30 minutes
- **Monthly savings:** $30-40
- **Annual savings:** $360-480
- **ROI:** Immediate

### Scenario 2: Quick + Medium (Phase 1 + 2)
- **Effort:** 2 hours
- **Monthly savings:** $40-60
- **Annual savings:** $480-720
- **ROI:** High (saves hours of work value)

### Scenario 3: Full Optimization (All phases)
- **Effort:** 8-10 hours planning/implementation
- **Monthly savings:** $50-70
- **Annual savings:** $600-840
- **Payback period:** <1 hour of dev time

---

## Cost Monitoring Setup

### Track Your Costs Monthly

**Azure Portal Method:**
1. Go to Cost Management + Billing
2. Set up cost alerts at $150/month threshold
3. Review actual vs estimated monthly

**CLI Command:**
```bash
az costmanagement query create \
  --scope "/subscriptions/[subscription-id]" \
  --timeframe MonthToDate \
  --type Usage
```

**Recommended:**
- Set alerts at $125, $150, $175 (escalating)
- Review monthly to catch overages early
- Adjust resource allocation as needed

---

## Warning Signs (Watch For)

These indicate costs are increasing:

- ⚠️ ACR storage warning (approaching 10GB limit)
- ⚠️ Multiple pod evictions (indicates memory pressure)
- ⚠️ Service Bus operations >1M/month (at Basic limit)
- ⚠️ PostgreSQL slow query logs (need more resources)

---

## Cost Optimization Best Practices

### 1. Right-sizing
- Start conservative (what you have now)
- Monitor actual utilization
- Reduce gradually, watch for issues

### 2. Shared Resources
- Combine dev/staging on cheaper nodes
- Production on separate cluster (once traffic warrants)

### 3. Automated Cleanup
- ACR image retention policies
- Unused storage snapshots
- Old database backups

### 4. Reserved Instances (Future)
- If costs stable, buy 1-year reserved instances
- Save additional 30-40% on compute
- When: Only after stabilizing architecture

---

## Summary

| Phase | Action | Savings | Time |
|-------|--------|---------|------|
| **1** | Reduce nodes 2→1 | -$30-40/mo | 5 min |
| **1** | Right-size pod limits | -$5-10/mo | 10 min |
| **2** | ACR cleanup policy | Prevents cost | 15 min |
| **2** | PostgreSQL tier check | -$10-20/mo | 10 min |
| **2** | Service Bus optional | -$5/mo | 5 min |
| **3** | Dev/prod separation | -$45-70/mo | 4-6 hrs |
| **3** | Remote storage | -$12/mo | 2 hrs |
| **Total** | | **-$50-157/mo** | **~6-8 hrs** |

**Immediate actions (Phase 1):** 15 minutes for $30-50/month savings
**Full optimization:** $600-840/year for ~8 hours of planning

---

## Files to Reference/Update

### Immediate Changes
- `infra/README.md` - Line 48: Change `--node-count 2` to `--node-count 1`
- `infra/helm/microservice/values.yaml` - Update CPU/memory limits

### Terraform (When Implemented from CI_CD_PIPELINE.md)
- `infra/terraform/main.tf` - PostgreSQL SKU, ACR settings
- `infra/terraform/variables.tf` - Environment-specific sizing

### Future Monitoring
- `MONITORING.md` - Add Prometheus remote storage configuration
- `CI_CD_PIPELINE.md` - Already includes Terraform templates

---

## Next Steps

1. **This week:** Implement Phase 1 (reduce nodes + right-size pods)
2. **This month:** Complete Phase 2 (verify tiers, set up cleanup)
3. **Next quarter:** Plan Phase 3 (only if needed based on growth)

**Expected outcome:** Reduce monthly costs from $135-200 to $105-150, with additional optimization potential as the system grows.
