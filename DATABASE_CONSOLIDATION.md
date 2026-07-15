# Database Architecture: PostgreSQL Only (No MongoDB)

Start fresh with PostgreSQL-only using Supabase. Simpler, cheaper, more reliable. No data migration needed.

---

## Current State vs Proposed

### Current Architecture
```
Supabase (PostgreSQL)
├── Identity Service (users, roles)
└── Tenant Service (restaurants, locations)

Cosmos DB (MongoDB)
├── Menu Service (menu items)
├── Inventory Service (stock, reservations)
├── Order Service (orders, line items)
└── Payment Service (transactions, receipts)

Total cost: $30-40 (Supabase) + $0-50 (Cosmos DB) = $30-90/month
```

### Proposed Architecture (RECOMMENDED)
```
Supabase (PostgreSQL)
├── Identity Service (users, roles)
├── Tenant Service (restaurants, locations)
├── Menu Service (menu items, categories)
├── Inventory Service (stock, reservations, item levels)
├── Order Service (orders, line items, order status)
└── Payment Service (transactions, receipts, payment methods)

No MongoDB needed!

Total cost: $30-40 (Supabase) = $30-40/month
Savings: $0-50/month (eliminate Cosmos DB entirely)
```

---

## Why This Works: PostgreSQL is Perfect for This

### What You're Currently Storing in MongoDB
**Menu Service:**
```json
{
  "id": "menu-123",
  "restaurantId": "restaurant-456",
  "name": "Burger",
  "category": "Main",
  "price": 12.99,
  "description": "Classic burger",
  "available": true,
  "createdAt": "2024-01-15"
}
```

**PostgreSQL equivalent (BETTER):**
```sql
CREATE TABLE menu_items (
  id UUID PRIMARY KEY,
  restaurant_id UUID REFERENCES restaurants(id),
  name VARCHAR(255) NOT NULL,
  category VARCHAR(100),
  price DECIMAL(10, 2),
  description TEXT,
  available BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Much better than MongoDB because:
-- ✅ Schema validation (prevents bad data)
-- ✅ Transactions (atomic updates)
-- ✅ Foreign keys (referential integrity)
-- ✅ Indexes (fast queries)
-- ✅ Joins (query across related data)
```

### Your Data is Structured, Not Document-Based

MongoDB shines when you have:
- ❌ Highly nested/hierarchical data
- ❌ Varying schema per document
- ❌ Unstructured text/logs
- ❌ Very large documents (>16MB)

Your data has:
- ✅ Flat, predictable schema
- ✅ Relationships between entities (orders → line items → menu items)
- ✅ Transactional consistency needs (payment must succeed atomically)
- ✅ Small documents (<1KB typical)

**Conclusion:** PostgreSQL is actually BETTER for your use case.

---

## Data Model: PostgreSQL Schema

### Identity Service (Already in PostgreSQL)
```sql
-- Already exists in Supabase
CREATE TABLE users (
  id UUID PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE roles (
  id UUID PRIMARY KEY,
  name VARCHAR(100) UNIQUE NOT NULL
);
```

### Tenant Service (Already in PostgreSQL)
```sql
-- Already exists in Supabase
CREATE TABLE restaurants (
  id UUID PRIMARY KEY,
  name VARCHAR(255),
  owner_id UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE locations (
  id UUID PRIMARY KEY,
  restaurant_id UUID REFERENCES restaurants(id),
  name VARCHAR(255),
  address TEXT
);
```

### Menu Service (Migrate from MongoDB)
```sql
CREATE TABLE menu_categories (
  id UUID PRIMARY KEY,
  restaurant_id UUID REFERENCES restaurants(id),
  name VARCHAR(100) NOT NULL,
  display_order INT
);

CREATE TABLE menu_items (
  id UUID PRIMARY KEY,
  restaurant_id UUID REFERENCES restaurants(id),
  category_id UUID REFERENCES menu_categories(id),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  price DECIMAL(10, 2) NOT NULL,
  available BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  INDEX idx_restaurant_available (restaurant_id, available)
);
```

### Inventory Service (Migrate from MongoDB)
```sql
CREATE TABLE inventory_items (
  id UUID PRIMARY KEY,
  menu_item_id UUID REFERENCES menu_items(id) UNIQUE,
  restaurant_id UUID REFERENCES restaurants(id),
  quantity_on_hand DECIMAL(10, 2) NOT NULL,
  reorder_level DECIMAL(10, 2),
  unit VARCHAR(50), -- e.g., "kg", "pcs", "liters"
  last_updated TIMESTAMP DEFAULT NOW(),
  
  INDEX idx_restaurant_low_stock (restaurant_id, quantity_on_hand)
);

CREATE TABLE inventory_reservations (
  id UUID PRIMARY KEY,
  inventory_item_id UUID REFERENCES inventory_items(id),
  order_id UUID REFERENCES orders(id),
  quantity_reserved DECIMAL(10, 2),
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Order Service (Migrate from MongoDB)
```sql
CREATE TABLE orders (
  id UUID PRIMARY KEY,
  restaurant_id UUID REFERENCES restaurants(id),
  location_id UUID REFERENCES locations(id),
  table_number INT,
  status VARCHAR(50), -- "pending", "preparing", "served", "paid", "closed"
  total_amount DECIMAL(10, 2),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  closed_at TIMESTAMP,
  
  INDEX idx_restaurant_status (restaurant_id, status),
  INDEX idx_table_active (table_number, status)
);

CREATE TABLE order_line_items (
  id UUID PRIMARY KEY,
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  menu_item_id UUID REFERENCES menu_items(id),
  quantity INT NOT NULL,
  unit_price DECIMAL(10, 2) NOT NULL,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Payment Service (Migrate from MongoDB)
```sql
CREATE TABLE payment_methods (
  id UUID PRIMARY KEY,
  restaurant_id UUID REFERENCES restaurants(id),
  name VARCHAR(100),
  stripe_id VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE payments (
  id UUID PRIMARY KEY,
  order_id UUID REFERENCES orders(id),
  restaurant_id UUID REFERENCES restaurants(id),
  amount DECIMAL(10, 2) NOT NULL,
  status VARCHAR(50), -- "pending", "succeeded", "failed", "refunded"
  payment_method_id UUID REFERENCES payment_methods(id),
  stripe_charge_id VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP,
  
  INDEX idx_order_status (order_id, status),
  INDEX idx_restaurant_date (restaurant_id, created_at)
);

CREATE TABLE payment_transactions (
  id UUID PRIMARY KEY,
  payment_id UUID REFERENCES payments(id),
  amount DECIMAL(10, 2),
  type VARCHAR(50), -- "charge", "refund"
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

## Implementation Plan: PostgreSQL Only (Greenfield)

### Phase 1: Create PostgreSQL Schema

**In Supabase SQL Editor, run the schema creation scripts:**

**Files to create:**
- `infra/migrations/001_create_menu_schema.sql`
- `infra/migrations/002_create_inventory_schema.sql`
- `infra/migrations/003_create_order_schema.sql`
- `infra/migrations/004_create_payment_schema.sql`

**Steps:**
1. In Supabase, go to SQL Editor
2. Copy-paste each migration script
3. Run queries to create tables
4. Verify tables created with `\dt` command

**Time:** 30 minutes

**No data migration needed - start with empty tables!**

---

### Phase 2: Update Services to Use PostgreSQL

**For each service (Menu → Inventory → Order → Payment):**

1. **Update data access layer**
   - Remove MongoDB client
   - Add PostgreSQL connection (Npgsql or Entity Framework)
   - Update repository/DAL classes

2. **Update queries**
   - Replace MongoDB queries with SQL
   - Use Entity Framework Core for .NET services
   - Example: 
     ```csharp
     // Before: MongoDB
     var items = await mongoCollection.Find(m => m.RestaurantId == id).ToListAsync();
     
     // After: PostgreSQL
     var items = await dbContext.MenuItems.Where(m => m.RestaurantId == id).ToListAsync();
     ```

3. **Test in local dev**
   - Verify reads/writes work
   - Check query performance
   - Test with MONITORING.md to trace

4. **Deploy to production**
   - Monitor Supabase database metrics
   - Watch for slow queries

**Time per service:** 1-2 hours each = 4-8 hours total

---

### Phase 3: Cleanup (Remove MongoDB)

**Once all services updated:**

1. Delete Cosmos DB account (save $0-50/month immediately)
2. Remove MongoDB/Cosmos NuGet packages from all services
3. Delete MongoDB settings from `appsettings.json`
4. Remove MongoDB from Docker local setup

**Time:** 15 minutes

---

## Greenfield Advantages

Since you're starting fresh (no migration needed):

✅ **No data loss risk** - Starting empty  
✅ **Faster implementation** - No migration scripts  
✅ **Cleaner code** - No legacy MongoDB code  
✅ **Better schema design** - Designed for PostgreSQL from start  
✅ **Immediate cost savings** - No "transition" period

---

## Benefits: PostgreSQL vs MongoDB

| Aspect | PostgreSQL | MongoDB | Winner |
|--------|-----------|---------|--------|
| **Cost** | Included in Supabase | Separate cost | ✅ PostgreSQL |
| **Transactions** | ACID guaranteed | Event consistency | ✅ PostgreSQL |
| **Relationships** | Foreign keys | Manual | ✅ PostgreSQL |
| **Consistency** | Strong | Eventual | ✅ PostgreSQL |
| **Query flexibility** | SQL (very flexible) | MongoDB query lang | 🤝 Tie |
| **Scaling** | Vertical (upgrade tier) | Horizontal (shards) | Depends |
| **Backups** | Supabase managed | Cosmos managed | 🤝 Tie |
| **Developer experience** | SQL well-known | Learning curve | ✅ PostgreSQL |
| **Your use case** | ✅ Perfect | ⚠️ Overkill | ✅ PostgreSQL |

---

## Cost Impact

### Current Monthly Cost
```
Supabase (PostgreSQL): $0-40/month
Cosmos DB (MongoDB):   $0-50/month
Total:                 $0-90/month
```

### After Consolidation
```
Supabase (PostgreSQL): $0-40/month
Cosmos DB:             $0 (eliminated)
Total:                 $0-40/month

Savings: $0-50/month (could be more if on paid Cosmos tier)
Annual savings: $0-600/year
```

### When to Upgrade Supabase Tier
- **Free tier:** 500MB database (current likely used)
- **Pro tier ($25/mo):** 8GB database (good for 10k+ users)
- **Team tier ($50/mo):** 100GB+ database (enterprise)

**Estimate:** Current data probably <100MB → plenty of room on Pro tier even with growth

---

## Implementation Roadmap (Greenfield)

### Day 1: Setup
- [ ] Review schema above
- [ ] Create Supabase SQL migration files (4 files)
- [ ] Run migration scripts in Supabase SQL Editor
- [ ] Verify tables created

### Days 2-3: Update Services (Menu Service first)
- [ ] Update Menu Service: Remove MongoDB, add PostgreSQL
- [ ] Update repository layer to use Entity Framework Core
- [ ] Test locally with LOCAL_DEVELOPMENT.md
- [ ] Deploy to production

### Days 4-5: Update Remaining Services
- [ ] Update Inventory Service
- [ ] Update Order Service
- [ ] Update Payment Service
- [ ] Deploy all to production

### Day 6: Cleanup
- [ ] Delete Cosmos DB account
- [ ] Remove MongoDB packages from all services
- [ ] Remove MongoDB from docker-compose.yml
- [ ] Update documentation

**Total time: ~1 week** (much faster than migration!)

---

## Risk Mitigation (Low Risk - Greenfield)

### What Could Go Wrong
- ⚠️ Query performance issues (rare)
- ⚠️ Transaction deadlocks (rare)
- ⚠️ Supabase connection issues (rare)

### How to Prevent
- ✅ Test queries locally before production
- ✅ Use MONITORING.md to track slow queries
- ✅ Use PostgreSQL transactions for payments
- ✅ Implement proper connection pooling
- ✅ Monitor Supabase metrics after deployment

**No data loss risk - starting fresh!**

---

## Code Changes Required

### Entity Framework Core (If using .NET)

**Before (MongoDB):**
```csharp
public class MenuRepository {
  private IMongoCollection<MenuItem> _collection;
  
  public async Task<MenuItem> GetByIdAsync(Guid id) {
    return await _collection.Find(m => m.Id == id).FirstOrDefaultAsync();
  }
}
```

**After (PostgreSQL):**
```csharp
public class MenuRepository {
  private ApplicationDbContext _dbContext;
  
  public async Task<MenuItem> GetByIdAsync(Guid id) {
    return await _dbContext.MenuItems.FirstOrDefaultAsync(m => m.Id == id);
  }
}
```

### appsettings.json Changes

**Before:**
```json
{
  "MongoDbSettings": {
    "Host": "cosmos.mongo.cosmos.azure.com",
    "Database": "restaurant-pos"
  }
}
```

**After:**
```json
{
  "PostgresSettings": {
    "ConnectionString": "Server=db.supabase.co;Database=postgres;User=postgres;Password=..."
  }
}
```

---

## Testing Checklist

- [ ] All menu items load correctly
- [ ] Inventory reservations work
- [ ] Orders create and update atomically
- [ ] Payments process without errors
- [ ] Queries complete in <500ms (check MONITORING.md)
- [ ] No N+1 query problems
- [ ] Concurrent requests don't cause deadlocks
- [ ] Backups working

---

## Performance Notes

PostgreSQL will actually be **faster** for your use case because:

1. **Joins are optimized** - Query order + customer + items in 1 query
2. **Indexes are intelligent** - Can index multiple columns
3. **Connection pooling works better** - Single connection type
4. **No serialization overhead** - Direct to/from SQL

**Expected result:** Same or better performance than MongoDB

---

## When NOT To Do This

Don't consolidate if:
- ❌ You need document-based storage (you don't)
- ❌ You have >50GB of data (you don't)
- ❌ You need horizontal sharding (you don't)
- ❌ You're actively using MongoDB features (you're not)

---

## Summary

✅ **PostgreSQL-only is the right choice**

**Why:**
- Your data is structured (not document-based)
- Need strong consistency (transactions for payments)
- Simpler operations (one database)
- Lower cost ($0-50/month savings)
- Better performance for your queries
- No data migration complexity

**How long:** ~1 week (much faster than migrating data!)

**Risk:** Very low (starting fresh, no legacy data)

**Cost savings:** $0-50/month immediately ($0-600/year)

---

## Files to Create

```
infra/migrations/
├── 001_create_menu_schema.sql
├── 002_create_inventory_schema.sql
├── 003_create_order_schema.sql
└── 004_create_payment_schema.sql
```

Just run these SQL scripts in Supabase - no C# migration scripts needed!

---

## Next Steps

1. **Copy the schema** from this document (see "Data Model: PostgreSQL Schema" section)
2. **Create 4 SQL files** in `infra/migrations/`
3. **Run in Supabase SQL Editor** to create tables
4. **Update services** to use PostgreSQL (remove MongoDB code)
5. **Delete Cosmos DB** when done

**Greenfield advantage:** No migration complexity, just fresh schema!

Ready to start implementing?
