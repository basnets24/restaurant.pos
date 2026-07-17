# Mongo → Postgres (Supabase) Migration Plan

## Goal

Move all MongoDB-backed persistence (catalog, order, payment) onto
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

Verified by a full code-level audit (not just config inspection) as of
this plan's latest update — see `docs/images/architecture-diagram.png`
and service `appsettings.json` files too:

| Service | DB today | Notes |
|---|---|---|
| identity | Postgres (`identity_db`, default schema) | EF Core, ASP.NET Identity tables + custom fields |
| tenant | Postgres (`identity_db`, `tenant` schema) | Owned by shared `Tenant.Domain` package |
| catalog | MongoDB (`restaurantpos-db`) | Collections `menuitems`, `inventoryitems` (merged menu+inventory; the old separate service's duplicate local `menuitems` copy no longer exists post-merge) |
| order | MongoDB, two databases on the **same** Mongo instance/connection: `restaurantpos-db` (entities) + `Order` (saga) | Collections `carts`, `diningtables`, `orders`, `pos-catalog-items` in `restaurantpos-db`; MassTransit `OrderState` saga in its own `Order`-named database (name comes from `ServiceSettings.ServiceName`, not `MongoDbSettings.DatabaseName` — same host/port, genuinely different database) |
| payment | MongoDB (`restaurantpos-db`) | Collection `payments` |

All Mongo documents implement `IEntity`/`ITenantEntity` from
`shared/common.library` and go through generic `MongoRepository<T>` /
`TenantMongoRepository<T>`, **except** `PosCatalogItem` in `order`, which
is accessed both ways (see "Known footguns" below) — that's the only
entity-level bypass of the repository abstraction anywhere in the
codebase (confirmed by grepping every service for raw
`IMongoCollection`/`IMongoDatabase` usage). Cross-service consistency is
maintained purely via MassTransit/RabbitMQ events — no service reaches
into another service's database.

### Known footguns to design around (found during audit, not in the original plan)

- **`PosCatalogItem`'s `Id`/`MenuItemId` split already caused a real bug.**
  `Id` is a `[BsonIgnore]`d computed property that just proxies
  `MenuItemId` (the real `[BsonId]`-mapped field), purely to satisfy the
  `IEntity` interface. `CartService.AddItemAsync` originally queried
  through the generic `IRepository<T>.GetAsync(Guid id)` overload (which
  filters on `x.Id`), and threw
  `ExpressionNotSupportedException: Expression not supported: Convert(x, IEntity).Id`
  at runtime, because `Id` isn't a real BSON field the Mongo LINQ
  translator can resolve. Fixed in commit `e7958fe` by querying on
  `MenuItemId` directly instead. **EF Core has no equivalent escape
  hatch** — the PK must be the actual interface member, or require
  explicit shadow-property/`HasKey` configuration. Cleanest fix during
  the `order` phase: rename `MenuItemId` to `Id` outright and drop the
  facade, rather than trying to preserve the trick.
- **`PosReadModelProjector` does partial-field atomic upserts** via
  `Builders<T>.Update.Set(...)/.SetOnInsert(...)` +
  `UpdateOneAsync(..., new UpdateOptions{IsUpsert=true})` — this is
  exactly why it can't use `IRepository<T>.UpdateAsync` (full-document
  `ReplaceOneAsync` only, no partial update in the current abstraction).
  The EF Core equivalent needs either a raw `INSERT ... ON CONFLICT DO
  UPDATE` or read-then-update via change tracking; a naive rewrite could
  silently lose the atomicity today's upsert gives for free.
- **A dedicated partitioner keeps updates to the same `pos-catalog-items`
  row ordered** (`MassTransitExtensions.cs`, keyed by `MenuItemId` across
  all 6 message types the projector consumes). Any EF Core rewrite must
  preserve an equivalent ordering guarantee (the same partitioner + a
  real `ON CONFLICT` upsert, or a unique constraint + retry) — without
  it, concurrent updates to the same menu item could race.
- **Dead code found on `pos-catalog-items`, worth cleaning up regardless
  of the migration**: `Extensions/PosCatalogRepositoryExtensions.cs`'s
  `AddPosCatalogReadModel()` registers its own separate singleton
  `IMongoCollection<PosCatalogItem>` and creates two more indexes — but
  that singleton is never actually injected anywhere; the projector
  builds its own collection handle from `IMongoDatabase` instead. Net
  effect: indexes on this one collection get created from three separate
  places today (the tenant repo's base index, plus this extension's two
  extras). Consolidate into one EF Core migration's index declarations
  when this collection migrates.
- **No Postgres-side health check exists yet.** `AddMongoDb()`
  (`shared/common.library/HealthChecks`) has no Npgsql/EF counterpart in
  the repo today — needs building during the Foundation phase, not
  assumed to fall out of EF Core for free.
- **`AppliedTax`/`AppliedDiscount`/`ServiceCharge` (`order`'s embedded
  arrays) are C# `record` types**, not classes. They serialize to `jsonb`
  fine via a plain JSON column + value converter — no need for EF Core's
  owned-entity-type machinery, which would be more ceremony than the
  "keep it mechanical" goal below calls for.
- **`DiningTable.Version`** is a plain `int` field today, not wired to
  Mongo's (or EF's) real concurrency-token mechanisms — inert. Leave it
  inert unless optimistic concurrency is explicitly wanted later; don't
  assume it already provides any protection.

## Target architecture

### Hosting

- **One Supabase project**, one Postgres database, **schema-per-service**
  (extends the pattern `identity_db` already uses for `tenant`):
  `identity`, `tenant`, `catalog`, `order`, `payment`.
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

- **Partially started already**: `shared/Common.Library/PostgreSQL/`
  (`IEfRepository<T>`, `EfRepository<T>`) exists from an earlier identity
  refactor — generic, no identity-specific code, genuinely reusable. But
  it is **not** a drop-in swap for `IRepository<T>` yet: method names
  differ (`GetByIdAsync`/`AddAsync`/`GetSingleAsync` vs Mongo's
  `GetAsync(Guid)`/`CreateAsync`/`GetAsync(predicate)`-returns-single),
  and it has **zero tenant scoping** — no `TenantEfRepository<T>` exists
  anywhere in the repo yet. Foundation-phase work is: build a
  `TenantEfRepository<T> : IRepository<T>` (matching the Mongo-shaped
  interface exactly, so no controller/service/consumer code needs to
  change) that uses EF Core underneath, reusing `EfRepository<T>`'s
  mechanics where practical rather than rewriting CRUD from scratch.
- **Only one repository gets built — no non-tenant sibling.** Mongo has
  two parallel `IRepository<T>` implementations: `MongoRepository<T>`
  (plain, no tenant scoping) and `TenantMongoRepository<T>` (the one
  actually used everywhere). The non-tenant one was a retrofit artifact,
  not an intentional design — and it's dead: confirmed by grep,
  `MongoRepository<T>`/`AddMongoRepository<T>()` are referenced only in
  their own definition file, never called by any service. Every real
  entity in `catalog`/`order`/`payment` is `ITenantEntity`, because this
  system is multi-tenant end-to-end with no legitimate non-tenant case.
  Don't reproduce that unused branch on the Postgres side — build
  `TenantEfRepository<T>` alone, tenant-aware from the start. One
  implementation means one index strategy and one query shape to reason
  about, instead of a parity-matrix between two paths only one of which
  is ever used. (`EfRepository<T>`/`IEfRepository<T>` stay as-is
  regardless — they already serve a real non-tenant case, identity's own
  entities like `ApplicationUser`, which aren't restaurant-tenant-scoped
  the same way.)
- Tenant scoping (`RestaurantId`/`LocationId` stamping + query filtering)
  moves from the Mongo repo's automatic behavior to EF Core global query
  filters + `SaveChanges` interception, preserving today's "callers don't
  have to think about tenancy" guarantee.
- Two behavioral differences to be aware of, not blockers, but worth
  testing explicitly rather than assuming parity:
  - `TenantMongoRepository<T>` creates its tenant composite index as a
    constructor side effect, every time the repo is instantiated. EF
    Core indexes are declared once in `OnModelCreating`/migrations — a
    fundamentally different lifecycle, not a per-instance runtime call.
  - `IRepository<T>.UpdateAsync` today is a full-document
    `ReplaceOneAsync` (Mongo has no concept of a partial update in this
    abstraction). EF Core's change tracker naturally does partial
    (dirty-field-only) updates instead — a behavior change, not a bug,
    but confirm nothing relies on the old full-replace semantics
    (e.g. a stale in-memory copy silently clobbering fields another
    caller just wrote).
  - `TenantMongoRepository<T>` is registered **scoped** (it captures
    `ITenantContext`, which is request-scoped) — `TenantEfRepository<T>`
    must be registered scoped for the same reason, and so must the
    `DbContext` it wraps.

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

Each phase below ends with that service's Mongo dependency fully removed
(package reference + `appsettings.json` Mongo settings), **except** the
shared `Common.Library` Mongo abstraction itself — that stays in place
until Phase 4, since earlier-migrated services' siblings still depend on
it until every service is off Mongo.

### Phase 0: Foundation

0.1. Build `TenantEfRepository<T> : IRepository<T>` in
     `Common.Library.PostgreSQL`, matching the Mongo-shaped interface
     exactly (`GetAsync(Guid)`, `GetAsync(predicate)`, `GetAllAsync()`,
     `GetAllAsync(predicate)`, `CreateAsync`, `UpdateAsync`,
     `DeleteAsync(Guid)`) — reuse `EfRepository<T>`'s `DbSet<T>`
     mechanics internally rather than rewriting CRUD.
0.2. Tenant scoping: a reusable base (`TenantDbContext` or an
     `OnModelCreating` helper) applying a global query filter on
     `RestaurantId`/`LocationId`, plus a `SaveChanges` override/
     interceptor that stamps both fields from `ITenantContext` on insert
     — mirroring `TenantMongoRepository<T>`'s automatic behavior so
     callers still don't have to think about tenancy.
0.3. Add a Postgres/Npgsql health check extension (e.g. `AddNpgsql()` in
     `Common.Library.HealthChecks`) — none exists today; don't assume EF
     Core provides one for free.
0.4. Stand up the Supabase project: one Postgres database,
     schema-per-service (`identity`, `tenant` already exist; add
     `catalog`, `order`, `payment`).
0.5. Wire Supavisor transaction-pooling connection strings; confirm exact
     Npgsql flags against current docs (`Multiplexing=false`,
     `No Reset On Close=true`, low `Maximum Pool Size` — these drift, so
     re-verify at implementation time rather than trusting this list).
0.6. Prove connectivity end-to-end against a throwaway table/entity
     before touching any real service's data.
0.7. Confirm local dev stays on the existing docker-compose Postgres
     container (`identity-postgres`) — only deployed environments point
     at Supabase.

**Verification:** a small test/scratch harness against
`TenantEfRepository<T>` confirming (a) two different tenants' rows never
leak into each other's queries, (b) create auto-stamps
`RestaurantId`/`LocationId` even if the caller didn't set them, (c) the
DI registration is scoped, not singleton, (d) the composite tenant index
appears via migration, not a runtime side effect.

### Phase 1: payment (simplest — proves the pattern)

1.1. Add `PaymentDbContext` (`DbSet<Payment>`), apply the Phase 0 tenant
     base.
1.2. EF Core migration: `payments` table, `Id uuid` PK,
     `RestaurantId`/`LocationId` composite index. Flat entity, no jsonb
     columns needed (confirmed no embedded arrays in `Payment`).
1.3. Swap `Program.cs`: `AddTenantMongoRepository<Payment>("payments")` →
     the new `TenantEfRepository<Payment>` + `PaymentDbContext`
     registration.
1.4. `appsettings.json`: remove `MongoDbSettings`, add the Postgres
     connection section (local Postgres container / Supabase per env).
1.5. Remove `MongoDB.Driver` from `PaymentService.csproj`.

**Verification:** re-run the full checkout flow built in the Stripe
Elements rework (`PaymentRequestedConsumer` creates the `PaymentIntent`
and persists `Payment`, `POST /orders/{orderId}/payment-confirm` reads
and updates it) end-to-end against Postgres — this exercises create,
read-by-`OrderId`-predicate, and update, the entire surface `Payment`
uses.

### Phase 2: catalog (merged menu+inventory)

2.1. Add `CatalogDbContext` (`DbSet<MenuItem>`, `DbSet<InventoryItem>`),
     tenant filters on both.
2.2. Migration: `Id uuid` PK + composite tenant index on each table.
     Optional upgrade (not required, decide at implementation time): now
     that both entities live in the same relational database, add a real
     FK constraint `InventoryItem.MenuItemId → MenuItem.Id` — Mongo had
     no way to enforce this relationally; Postgres does.
2.3. Swap DI registrations in `Program.cs`, update `appsettings.json`,
     remove `MongoDB.Driver` from `CatalogService.csproj`.

**Verification:** re-run the exact menu-item lifecycle test from the
menu/inventory merge (create → linked inventory record appears at zero
stock → restock/mark available/delete → sync in both directions) against
Postgres — this is the same test, just against a new backing store, and
it's the right one because it already exercises every read/write path
both entities have.

### Phase 3: order (highest risk — do last)

Split into three sub-phases; do them in order, verify each before moving on.

**3a. Domain entities (`Cart`, `DiningTable`, `Order`)**

3a.1. Add an `OrderDbContext` with `DbSet<Cart>`, `DbSet<DiningTable>`,
      `DbSet<Order>`.
3a.2. Embedded arrays → `jsonb` columns via a plain
      `System.Text.Json` value converter (not EF's owned-entity-type
      machinery — unnecessary ceremony here, and `AppliedTax`/
      `AppliedDiscount`/`ServiceCharge` being `record` types serializes
      cleanly through STJ as-is): `Cart.Items`, `Order.Items`,
      `Order.AppliedDiscounts`, `Order.AppliedTaxes`,
      `Order.ServiceCharges`.
3a.3. Migration for `carts`, `diningtables`, `orders` tables.
3a.4. Swap registrations, update `appsettings.json`.

*Verification:* cart create/add-item/remove-item/checkout (the same flow
the `PosCatalogItem` field-name bug was caught in) and table
status/session flows, end-to-end against Postgres.

**3b. `pos-catalog-items` read model — the riskiest single piece in this
whole plan**

3b.1. **Redesign the entity first**: rename `PosCatalogItem.MenuItemId`
      to `Id`, delete the `[BsonIgnore]`d computed `Id` facade entirely.
      EF Core has no equivalent trick — the interface member must be the
      real PK — so this isn't optional cleanup, it's required for the
      entity to even map.
3b.2. Add `DbSet<PosCatalogItem>` to `OrderDbContext`, migration with
      `Id uuid` PK and the tenant composite index, plus the two indexes
      `AddPosCatalogReadModel()` creates today (availability;
      category/name search) — consolidated into this one migration.
3b.3. **Delete `Extensions/PosCatalogRepositoryExtensions.cs` and its
      `AddPosCatalogReadModel()` call in `Program.cs` entirely** —
      confirmed dead code today (registers a singleton
      `IMongoCollection<PosCatalogItem>` nothing ever injects); no
      replacement needed, its only *live* effect (index creation) is
      folded into 3b.2's migration.
3b.4. Rewrite `PosReadModelProjector`'s 6 `Consume` methods: today's
      `Builders<T>.Update.Set(...)/.SetOnInsert(...)` +
      `UpdateOneAsync(..., IsUpsert=true)` partial-field atomic upserts
      need a real Postgres equivalent —
      `INSERT ... ON CONFLICT (id) DO UPDATE SET ...` (raw SQL via EF, or
      Npgsql directly) preserving exactly which fields each event type
      touches today (e.g. `MenuItemCreated` only sets
      `Name`/`Category`/`BasePrice`/`MenuAvailable`, never touches
      `Quantity`/`InventoryAvailable` — the upsert must not clobber those
      on conflict). A naive read-modify-write via EF change tracking
      would lose the atomicity the current upsert gives for free under
      concurrent events for the same item.
3b.5. No change needed to the MassTransit partitioner in
      `MassTransitExtensions.cs` (still keyed by `MenuItemId` — rename
      call sites to `Id` where the partitioner reads `.Message.Id`, but
      the ordering guarantee itself carries over unchanged) — just
      confirm it's still in place, since it's what makes 3b.4's
      per-row upserts safe under concurrency.
3b.6. `CartService`'s read-only lookup
      (`_posCatalog.GetAsync(x => x.MenuItemId == ...)`) becomes
      `GetAsync(x => x.Id == ...)` (or just `GetAsync(Guid)` now that
      `Id` is real) — update this one call site.

*Verification:* the full order lifecycle end-to-end — menu item created
→ `pos-catalog-items` row appears with correct initial
availability/quantity → add to cart (exercises 3b.6's read path) →
checkout → reserve → pay → complete — with particular attention to what
happens when two events for the same item arrive close together (e.g.
create a menu item and immediately restock it), confirming no field gets
clobbered by an out-of-order or partial upsert.

**3c. MassTransit saga (`OrderStateMachine`/`OrderState`)**

3c.1. Swap `.MongoDbRepository(...)` for MassTransit's built-in
      `.EntityFrameworkRepository(...)` in `MassTransitExtensions.cs`.
      Confirm at implementation time which lock-statement provider
      MassTransit's EF saga repository needs for Npgsql specifically
      (API naming here may have changed between MassTransit versions —
      don't assume the SQL Server default applies to Postgres).
3c.2. Migration for the `OrderState` table: `CorrelationId` PK,
      `CurrentState`, `RestaurantId`/`LocationId`, `OrderId`,
      `CustomerId`, `TableId`, `Items` (jsonb), `OrderTotal`,
      `SubmittedAt`, `LastUpdated`, `ErrorMessage`,
      `PaymentTimeoutTokenId`, `InventoryCheckedAt`, `PaymentProcessedAt`,
      and `Version` — note `OrderState.Version` (it implements
      `ISagaVersion`) is a **real, already-wired optimistic-concurrency
      token** for MassTransit's saga repository, unlike the unrelated,
      inert `DiningTable.Version` field found during the audit — don't
      confuse the two or assume `DiningTable.Version` needs the same
      treatment.
3c.3. This retires the separate `Order`-named Mongo database entirely —
      the saga can live in the same Postgres schema as the rest of
      `order`'s entities (or its own schema; a call to make at
      implementation time, but no longer forced apart by two different
      persistence technologies).

*Verification:* this is the highest-value test in the entire plan —
exercise every saga path, not just the happy one: submit → reserve →
pay → complete; `InventoryReserveFaulted` → `Rejected`; `PaymentFailed`
→ `ReleaseInventory` → `Rejected`; `PaymentTimeout` expiring →
`ReleaseInventory` → `Rejected`. Confirm state transitions, scheduled
message (`PaymentTimeout`) behavior, and compensation all still work
identically under the EF Core saga repository.

### Phase 4: Final cleanup (only after payment + catalog + order are all confirmed stable on Postgres)

4.1. Delete `shared/common.library/MongoDB/` entirely — `MongoRepository.cs`,
     `TenantMongoRepository.cs`, `MongoIndexConfigurator.cs` (confirmed
     unused scaffolding even before this migration — no service ever
     implemented it), `Extensions.cs`.
4.2. Delete `shared/common.library/HealthChecks`'s Mongo health check and
     `AddMongoDb()`.
4.3. Delete `MongoDbSettings.cs`.
4.4. Remove the `MongoDB.Driver` package reference from
     `Common.Library.csproj`; grep the whole repo for any other
     `MongoDB.Driver` reference to confirm none remain in any service
     `.csproj`.
4.5. Remove `restaurant-mongo` from `infra/docker-compose.yml` and from
     `scripts/dev.sh`'s `INFRA_CONTAINERS` wait list.
4.6. Repo-wide grep sweep for `Mongo`/`BsonId`/`BsonIgnore` — confirm zero
     remaining references outside git history.
4.7. Bump `Common.Library`'s version and republish (consumed via
     GitHub Packages, not project references, per this repo's established
     pattern — a forgotten version bump silently no-ops rather than
     erroring, so don't skip this step).
4.8. Update root `README.md`/architecture docs that still describe
     MongoDB as part of the stack.

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
