# Database Strategy & Cost Analysis

How to scale the database layer cost-effectively without breaking the bank on distributed databases.

---

## The Distributed Database Problem

### Current Architecture (Centralized - Low Cost)
```
┌─────────────────────────────────────┐
│     All 7 Services                   │
├─────────────────────────────────────┤
│  ↓                  ↓                 │
┌──────────────────┐  ┌──────────────┐ │
│  PostgreSQL      │  │  MongoDB     │ │
│  (1 instance)    │  │  (1 instance)│ │
│  $30-40/mo       │  │  $0 (free)   │ │
└──────────────────┘  └──────────────┘ │
└─────────────────────────────────────┘
Cost: $30-40/month
```

### Distributed Database Problem (Anti-pattern for cost)
```
┌────────────────────────────────────────────────┐
│     Per-Service Databases (Anti-pattern!)      │
├────────────────────────────────────────────────┤
│                                                 │
│  Identity      Menu       Inventory    Order   │
│  ┌─────────┐  ┌─────────┐ ┌────────┐ ┌─────┐ │
│  │PostgreSQL├─→│MongoDB ├─→│CosmosDB├→│ ... │ │
│  │ $30/mo  │  │ $25/mo  │ │$30/mo  │ │     │ │
│  └─────────┘  └─────────┘ └────────┘ └─────┘ │
│                                                 │
│  Payment     Tenant    Frontend    Total       │
│  ┌─────────┐ ┌──────┐  ┌────────┐             │
│  │CosmosDB ├→│MySQL ├→ │NoSQL   │ $155/mo    │
│  │ $30/mo  │ │$20/mo│  │$20/mo  │ (5x cost!) │
│  └─────────┘ └──────┘  └────────┘             │
│                                                 │
└────────────────────────────────────────────────┘
Cost: $155-200/month (5x your current spend!)
```

**The trap:** Each service gets "its own database" for independence, but you pay for 7 separate instances instead of 2 shared ones.

---

## Cost Analysis: Centralized vs Distributed

### Scenario 1: Centralized (Current - RECOMMENDED)
```
PostgreSQL:  1 × Basic        $30-40/month
MongoDB:     1 × Free tier    $0/month
Total:       2 instances      $30-40/month
```

**Advantages:**
- ✅ Lowest cost
- ✅ Simple operations
- ✅ No distributed transaction issues
- ✅ Easy backups/recovery
- ✅ Consistent data access patterns

**Disadvantages:**
- ❌ Shared database (schema coupling)
- ❌ Single point of failure
- ❌ Scales to ~5-10 services max
- ❌ Harder data isolation between services

---

### Scenario 2: Partially Distributed (Compromise)
```
PostgreSQL:  2 × Basic (Master + Read Replica)    $50-60/month
MongoDB:     2 × Shared tier                      $30-40/month
Total:       4 instances                          $80-100/month
```

**Advantages:**
- ✅ Read replicas for scale
- ✅ Geographic distribution possible
- ✅ Backups still simplified
- ✅ Better isolation between logical domains

**Disadvantages:**
- ❌ 2-3x cost increase
- ❌ Cross-database transactions harder
- ❌ More operational complexity

---

### Scenario 3: Full Distributed per Service (ANTI-PATTERN)
```
PostgreSQL × 3 instances    $90-120/month
MongoDB × 2 instances       $50-60/month
CosmosDB × 2 instances      $60-80/month
Other DBs × 2 instances     $50-60/month
Total:     9 instances      $250-320/month
```

**Advantages:**
- ✅ Complete service independence
- ✅ Scale each service separately
- ✅ Different tech per service

**Disadvantages:**
- ❌ **5-8x cost increase ($150-280/month extra!)**
- ❌ Complex distributed transactions
- ❌ Hard to query across services
- ❌ Operational nightmare
- ❌ **Never justifiable for this scale**

---

## Recommended Strategy: Tiered Approach

Scale the database layer WITHOUT distributed databases. Move up as you grow.

### Tier 1: Current (0-100 concurrent users)
**Cost: $30-40/month**

```
PostgreSQL (Single instance)
├── Identity (user/role data)
├── Tenant (restaurant/location data)
└── [Reserved for future]

MongoDB (Single instance)
├── Menu (menu items)
├── Inventory (stock)
├── Order (orders)
└── Payment (transactions)
```

**When to stay here:**
- <100 concurrent users
- <1GB data per service
- <1000 orders/day
- Single region (no geo-distribution needed)
- Personal/demo project (forever)

---

### Tier 2: Optimized Single Instance (100-1000 concurrent users)
**Cost: $60-80/month** (+$20-40)

```
PostgreSQL (Upgraded to General Purpose B4s)
├── Identity
├── Tenant
└── Tuned indexes, query optimization

MongoDB (Upgraded to Shared tier)
├── Menu, Inventory, Order, Payment
└── Automated backups, more performance
```

**Scaling tactics (NO new instances):**
- Add indexes to hot queries
- Enable query caching in services
- Use connection pooling (PgBouncer)
- Archive old order data
- Read replicas if read-heavy (still 1 primary)

**When to move here:**
- 100-1000 concurrent users
- Response times >500ms
- Database CPU consistently >60%
- Need automated backups
- Still single-region

---

### Tier 3: Read Replicas (1000-10k concurrent users)
**Cost: $100-150/month** (+$50-100)

```
PostgreSQL Primary (General Purpose B4s)
├── All writes
├── Identity, Tenant
└── $40-50/month

PostgreSQL Read Replicas × 2 (readonly)
├── Serve read queries
└── $25-30/month each

MongoDB Sharded Cluster (3+ nodes)
├── Auto-distributed
├── Menu, Inventory, Order, Payment
└── $50-70/month total
```

**When to move here:**
- 1000+ concurrent users
- >10GB data
- Heavy read traffic (90% reads)
- Multi-region needed
- Revenue can support $150/mo

---

### Tier 4: Truly Distributed (10k+ concurrent users, enterprise)
**Cost: $300-500+/month**

**Only do this if:**
- ✅ You have 10k+ daily users
- ✅ Each service needs independent scaling
- ✅ Services are geographically distributed
- ✅ You can afford the operational complexity
- ✅ You've exhausted Tier 3 options

**NEVER do this because:**
- ❌ You read an article about microservices
- ❌ You want "true" database isolation
- ❌ You're planning for hypothetical scale
- ❌ You think it's "industry standard"

---

## Cost-Effective Scaling Strategies (Without New Databases)

Instead of adding databases, use these techniques:

### 1. Query Optimization (Free)
```sql
-- Before: 5000ms query
SELECT orders.*, customers.*, products.* 
FROM orders 
LEFT JOIN customers ON ...
LEFT JOIN products ON ...
WHERE orders.restaurant_id = $1;

-- After: 50ms with index
CREATE INDEX idx_restaurant_orders ON orders(restaurant_id, created_at);
CREATE INDEX idx_restaurant_inventory ON inventory(restaurant_id);
```

**Cost:** 0 (just developer time)
**Impact:** 10-100x faster queries

---

### 2. Caching Layer (TanStack Query + Redis)
```typescript
// Current: Every request hits database
const { data: menuItems } = useQuery({
  queryKey: ['menu', restaurantId],
  queryFn: () => api.getMenu(restaurantId)
});

// Optimized: Browser cache + Redis backend cache
// TanStack Query caches in memory (free)
// Redis caches for 5 minutes (optional: $10-20/mo for Azure Cache)
```

**Cost:** $0-20/month (for Redis, optional)
**Impact:** 90% reduction in database queries

---

### 3. Connection Pooling (PgBouncer)
```ini
# Instead of each service having 10 connections to PostgreSQL
[databases]
restaurant_pos = host=postgres.database.azure.com port=5432

# With pooling: 1 connection per service → 10 total
max_client_conn = 1000
default_pool_size = 10
```

**Cost:** Free (self-hosted in AKS)
**Impact:** Support 10x more concurrent users

---

### 4. Archival Strategy (Delete old data)
```sql
-- Keep only last 2 years of completed orders
DELETE FROM orders 
WHERE status = 'completed' 
AND created_at < NOW() - INTERVAL '2 years'
AND archived_at IS NOT NULL;

-- Archive table: $2-5/mo in Azure Storage
CREATE TABLE orders_archive AS SELECT * FROM orders WHERE created_at < ...;
```

**Cost:** $2-5/month for cold storage
**Impact:** 50% reduction in active database size

---

### 5. Partitioning (Horizontal Scaling)
```sql
-- Instead of distributing to new database,
-- partition large tables in existing database

CREATE TABLE orders_2024 (LIKE orders INCLUDING ALL) 
PARTITION OF orders
FOR VALUES FROM ('2024-01-01') TO ('2025-01-01');

CREATE TABLE orders_2025 (LIKE orders INCLUDING ALL)
PARTITION OF orders  
FOR VALUES FROM ('2025-01-01') TO ('2026-01-01');
```

**Cost:** Free (database feature)
**Impact:** 2-3x faster queries on large tables

---

### 6. Read Replicas in Same Instance (If upgraded)
```bash
# Instead of separate database instance per region
# Use PostgreSQL read replica in different Azure region

az postgres flexible-server replica create \
  --master-server restaurant-pos-postgres \
  --location "westeurope"  # Different region, same instance
```

**Cost:** Additional replication cost (~$15-20/mo)
**Impact:** Fast reads from any region, without new database

---

## The Honest Truth About Microservices

| What You Hear | What It Actually Means | Cost |
|---|---|---|
| "Each service should have its own database" | Each service should own its data schema | Could be 1 DB with schemas per service |
| "Loose coupling" | Services don't directly call each other | Still could share database with events |
| "Scale independently" | Service can handle spike independently | Usually solved with caching, not databases |
| "Use the right tool for each service" | Different tech where it fits | 90% of cases: SQL + NoSQL is enough |

**Reality for most projects:**
- 1-2 databases serving 5-10 services is normal
- Distributed databases are for Netflix/Uber scale
- Adding databases is usually the wrong answer
- Fixing queries/caching is usually the right answer

---

## Decision Tree: When to Add Databases

```
Does your current database have problems?
├─ NO → Stay with current setup
└─ YES → Does it have query performance issues?
    ├─ YES → Optimize queries first, add indexes
    │        Still slow? Add read replica
    │        Still slow? Add caching layer
    │        Still slow? Then consider distributed DB
    └─ NO → Storage too large?
        ├─ YES → Archive old data, delete unnecessary data
        │        Still too large? Consider partitioning
        │        Still too large? Then consider split
        └─ NO → Different data model needed?
            ├─ YES → Add different DB TYPE (not instance)
            │        Use MongoDB alongside PostgreSQL
            │        NOT separate PostgreSQL per service
            └─ NO → Stay with current setup
```

---

## Cost Projection by Scale

| Scale | Current Tier | Database Cost | Recommended |
|-------|--------------|---------------|-------------|
| **Personal project** | Tier 1 | $30-40/mo | PostgreSQL + MongoDB |
| **<1000 DAU** | Tier 1 | $30-40/mo | Keep current setup |
| **1k-10k DAU** | Tier 2 | $60-80/mo | Upgrade instance size |
| **10k-100k DAU** | Tier 3 | $100-150/mo | Add read replicas |
| **100k+ DAU** | Tier 4+ | $300+/mo | Consider distributed DB |

**Your personal project:** Stay at Tier 1-2 **forever** unless it becomes enterprise software.

---

## Implementation Roadmap

### Now (Tier 1 - Optimized)
- ✅ Keep current: PostgreSQL + MongoDB
- ✅ Add connection pooling (PgBouncer)
- ✅ Optimize hot queries (via logs in MONITORING.md)
- ✅ Add caching in frontend (TanStack Query)
- **Cost:** $30-40/mo

### If 100 concurrent users (Tier 2)
- Upgrade PostgreSQL to General Purpose B4s
- Upgrade MongoDB to Shared tier
- Enable automated backups
- **Cost:** $60-80/mo

### If 1000 concurrent users (Tier 3)
- Add read replicas for PostgreSQL
- Enable MongoDB sharding
- Setup multi-region
- **Cost:** $100-150/mo

### If 10k+ users (Tier 4)
- Only then consider service-specific databases
- But by then, you'll have revenue to support $300+/mo

---

## How to Make a Database Decision

**Bad reasons to add a database:**
- ❌ "Microservices should have separate databases"
- ❌ "I read about event sourcing"
- ❌ "Netflix uses distributed databases"
- ❌ "Future-proofing"
- ❌ "To avoid schema coupling"

**Good reasons to add/change a database:**
- ✅ Current database is actually the bottleneck (proven by metrics)
- ✅ Need different data model (e.g., graph for relationships)
- ✅ Cost/performance analysis shows ROI
- ✅ Data governance requires isolation
- ✅ Actual users are hitting limits

---

## Summary: The Safe Path Forward

### What You Have Now
- 1 PostgreSQL instance
- 1 MongoDB instance
- Total cost: $30-40/month
- Can support: 1000s of concurrent users

### What To Do
1. **Optimize before scaling** - Use MONITORING.md to find slow queries
2. **Cache aggressively** - TanStack Query + Redis if needed
3. **Add indexes** - Usually 100x ROI
4. **Archive old data** - Keep database lean
5. **Scale vertically first** - Bigger instance before distributed
6. **Only split if measured** - Not hypothetical

### What NOT To Do
- ❌ Don't add 7 databases "just in case"
- ❌ Don't follow distributed patterns prematurely
- ❌ Don't assume you'll scale to Netflix
- ❌ Don't trade simplicity for imaginary scale

---

## Cost Impact Summary

| Action | Cost Change | Recommendation |
|--------|-------------|-----------------|
| Current setup | Baseline | ✅ Keep as-is |
| Optimize queries | -$5-10/mo | ✅ Do this first |
| Add connection pooling | $0 | ✅ Free, always do |
| Add Redis caching | +$10-20/mo | ⚠️ Only if needed |
| Upgrade to Tier 2 | +$20-40/mo | ✅ When needed |
| Add read replicas | +$25-40/mo | ⚠️ Only at Tier 3 |
| Per-service databases | +$100-150/mo | ❌ Never do this |

**Bottom line:** Stay at $30-40/month with proper optimization. You can serve 10,000+ concurrent users before needing to spend more.

---

## Files to Reference

- **COST_OPTIMIZATION.md** - Quick wins for overall infrastructure
- **CI_CD_PIPELINE.md** - Terraform will manage database configuration
- **MONITORING.md** - Identify which queries are slow before scaling database
- **LOCAL_DEVELOPMENT.md** - Local PostgreSQL + MongoDB setup

---

## Final Advice

> **When someone says "microservices need separate databases," ask: "What problem does that solve?"**
> 
> Usually: "Loose coupling"
> 
> Usually better: Better API contracts + caching layers
> 
> Sometimes: Different tech (use MongoDB alongside PostgreSQL, not separate instances)
> 
> Rarely: Need for actual distributed databases
> 
> Cost difference: $30/mo vs $300/mo (10x!)
>
> **Choose wisely.**
