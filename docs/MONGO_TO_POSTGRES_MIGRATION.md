# Mongo → Postgres (Supabase) Migration Plan

## Goal

Move all MongoDB-backed persistence (menu, inventory, order, payment) onto
PostgreSQL, hosted on a single free-tier Supabase project, consolidating
with the existing Postgres usage in identity/tenant.

**Prerequisite (done):** tenant was merged into identity and inventory
into menu (renamed `catalog`), dropping the service count from 6 to 4
before this plan's phases begin — directly reducing how many independent
connection pools have to fit inside the Supabase free-tier connection cap.

## Why

- Supabase's free tier only gives us Postgres, not Mongo — standardizing on
  one database technology lets us host everything for free.
- identity and tenant already run on Postgres via EF Core; unifying removes
  the second database technology (Mongo) from the stack entirely.

## Current state (baseline)

See `docs/images/architecture-diagram.png` and service `appsettings.json`
files for the authoritative source; summary as of this plan:

| Service | DB today | Notes |
|---|---|---|
| identity | Postgres (`identity_db`, default schema) | EF Core, ASP.NET Identity tables + custom fields |
| tenant | Postgres (`identity_db`, `tenant` schema) | Owned by shared `Tenant.Domain` package |
| menu | MongoDB (`restaurantpos-db`) | Collection `menuitems` |
| inventory | MongoDB (`restaurantpos-db`) | Collections `inventoryitems`, local `menuitems` copy |
| order | MongoDB (`restaurantpos-db` + separate `Order` db for saga) | Collections `carts`, `diningtables`, `orders`, `pos-catalog-items`; MassTransit `OrderState` saga |
| payment | MongoDB (`restaurantpos-db`) | Collection `payments` |

All Mongo documents implement `IEntity`/`ITenantEntity` from
`shared/common.library` and go through generic `MongoRepository<T>` /
`TenantMongoRepository<T>`. Cross-service consistency is maintained purely
via MassTransit/RabbitMQ events — no service reaches into another service's
database.

## Target architecture

### Hosting

- **One Supabase project**, one Postgres database, **schema-per-service**
  (extends the pattern `identity_db` already uses for `tenant`):
  `identity`, `tenant`, `menu`, `inventory`, `order`, `payment`.
- All services connect through **Supavisor in transaction pooling mode**,
  not direct connection — required to stay under the free-tier connection
  cap with 6 services each holding a pool.
- Each service's Npgsql connection string caps `Maximum Pool Size` low
  (2-3), and disables prepared-statement caching (required in transaction
  pooling mode: `Multiplexing=true` off, `No Reset On Close=true`, or
  equivalent Npgsql settings — confirm exact flags against Supavisor docs
  when implementing).
- **Local dev stays on the existing docker-compose Postgres container**
  (`identity-postgres`), not Supabase — avoids burning free-tier connection
  budget and network dependency during local dev/CI. Only shared/deployed
  environments point at Supabase.

### Repository layer

- Add a generic EF Core repository to `Common.Library` mirroring the
  existing Mongo repo interface (`IEntity`, `ITenantEntity`,
  `TenantMongoRepository<T>`) — e.g. `EfRepository<T>` /
  `TenantEfRepository<T>` implementing the same interface the Mongo repos
  do today. Goal: swapping a service's persistence is a DI registration +
  DbContext/migration change, not a rewrite of controllers/services.
- Tenant scoping (`RestaurantId`/`LocationId` stamping + query filtering)
  moves from the Mongo repo's automatic behavior to EF Core global query
  filters + `SaveChanges` interception, preserving today's "callers don't
  have to think about tenancy" guarantee.

### Schema design

- Embedded arrays that exist in the Mongo documents today (`CartItem[]`,
  `OrderItem[]`, `AppliedDiscount[]`, `AppliedTax[]`, `ServiceCharge[]`) map
  to **`jsonb` columns** initially, not normalized child tables. Keeps the
  migration mechanical and close to the existing document shape; normalize
  later only if we need to query inside them relationally.
- Top-level documents (`MenuItem`, `InventoryItem`, `Cart`, `DiningTable`,
  `Order`, `PosCatalogItem`, `Payment`) become normal tables with `Id uuid`
  PK and `RestaurantId`/`LocationId` columns, indexed as a composite (as
  the Mongo composite index does today).
- `OrderState` saga: swap MassTransit's Mongo saga repository for its
  built-in **EF Core saga repository** — supported out of the box, one
  migration, no interface changes needed elsewhere.

## Phasing (convert one service at a time, lowest-risk first)

1. **Foundation** — build `EfRepository<T>`/`TenantEfRepository<T>` in
   `Common.Library`, stand up the Supabase project + schemas, wire
   Supavisor pooling, prove connectivity from one throwaway/test service.
2. **payment** — simplest schema (flat entity, no embedded arrays, no
   saga). Proves the pattern end-to-end with the lowest blast radius.
3. **catalog** (merged menu+inventory) — flat entities, low traffic
   dependency-wise (other services consume its events, not its DB).
4. **order** — highest risk: embedded arrays (→ jsonb), the
   `pos-catalog-items` cross-service projection, and the MassTransit saga
   swap. Do this last, once the pattern is proven three times over.

Each phase: add EF Core DbContext + migrations for that service's schema,
swap repository DI registrations, update `docker-compose.yml`/local dev if
needed, remove the service's Mongo dependency once verified, update
`appsettings.json` connection strings (Supabase for deployed envs, local
Postgres container for dev).

## Open questions / risks

- Exact Npgsql connection-string flags required for Supavisor transaction
  pooling mode (needs confirming against current Supabase/Npgsql docs at
  implementation time — this changes periodically).
- Whether `pos-catalog-items` (a read-model projection) is better kept as
  a Postgres table (simple, transactional) or reconsidered as something
  cache-like — decide during the order phase, not up front.
- Data migration strategy for any existing production/staging Mongo data
  (out of scope for this plan if there's no real data to migrate yet;
  revisit if that assumption is wrong).
- Confirm Supabase free-tier limits (storage, compute pausing after
  inactivity) are acceptable for the intended environments before
  committing deployed (non-local) traffic to it.

## Explicitly out of scope for this plan

- Removing RabbitMQ/MassTransit or changing the event-driven integration
  architecture — only the persistence layer changes.
- Normalizing the jsonb-embedded arrays into child tables — deferred
  unless a real query need arises.
