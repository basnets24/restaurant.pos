# Service Consolidation Plan

## Goal

Reduce from 6 backend services to 4 by merging `tenant` into `identity`
and `inventory` into `menu` (renamed `catalog`), before moving anything to
Postgres/Supabase. See `docs/MONGO_TO_POSTGRES_MIGRATION.md` — this plan
is a prerequisite phase for that one: fewer services means fewer
connection-pool allocations against the Supabase free tier.

## Why

- `tenant` has no DbContext of its own — it calls straight into the shared
  `Tenant.Domain` package, which `identity` already also embeds directly
  (`TenantService:Mode = Embedded`) as an alternative to calling `tenant`
  over HTTP. The merge formalizes a path the code already supports, and
  removes the weaker, HTTP-based path instead of maintaining both.
- `inventory` consumes `MenuItemCreated/Updated/Deleted` events purely to
  keep its own denormalized copy of menu items in sync. That's solving a
  problem that doesn't exist if menu and inventory data live in the same
  service/database — it becomes a plain query instead of an
  eventually-consistent copy.
- `order` + `payment` stay separate — payment owns Stripe secrets, webhook
  handling, and PCI-adjacent concerns, and the checkout saga is
  orchestrating a real distributed transaction, not just paying an
  overhead tax. See prior discussion; not revisited here.

## Merge 1: tenant → identity — Done

`tenant` has been merged into `identity` and `services/tenant/` deleted.

## Merge 2: inventory → menu (renamed to `catalog`) — Done

`inventory` has been merged into `menu`, renamed `catalog`, and
`services/inventory/`/`services/menu/` deleted in favor of
`services/catalog/`. Reserve/release inventory queue names were kept
unchanged so `order`'s saga needed no changes; identity's
`inventory.read/write` scopes were renamed to `catalog.inventory.read/write`.

### Original current-state notes (pre-merge, kept for history)

- `menu` service: `menuitems` Mongo collection, publishes
  `MenuItemCreated/Updated/Deleted`.
- `inventory` service: `inventoryitems` collection (owns quantity/
  availability) + a local denormalized `menuitems` copy kept in sync via
  `MenuItemCreatedConsumer`/`UpdatedConsumer`/`DeletedConsumer`. Publishes
  `InventoryItem*` events.
- `order`'s `PosCatalogItem` projector consumes both `MenuItem*` and
  `InventoryItem*` events directly — it does not depend on inventory's
  internal copy, so this merge doesn't touch that projection's inputs.

### Steps

1. Rename `menu` service to `catalog` (or keep the `menu` name and treat
   inventory as absorbed — naming is a call to make at implementation
   time; `catalog` better reflects the merged responsibility).
2. Move `InventoryItem` entity, its controllers, and quantity/availability
   logic into the `catalog` service, backed by the same Mongo database the
   service already uses (still Mongo at this stage — Postgres migration
   is a later, separate phase).
3. Delete inventory's local denormalized `menuitems` copy and its three
   `MenuItemCreated/Updated/DeletedConsumer` classes — replace with a
   direct in-process query against the real `menuitems` collection.
4. Keep publishing `MenuItemCreated/Updated/Deleted` and
   `InventoryItem*` events unchanged — `order`'s `PosCatalogItem`
   projector and any other external consumers still need them; only the
   internal inventory-consuming-its-own-service's-events step goes away.
5. Delete `services/inventory/` — Dockerfile, Helm values,
   docker-compose entry, CI workflow references, ingress route.
6. Update frontend API client base URLs for both former menu and
   inventory endpoints to point at `catalog`.

## Sequencing

Do this before `docs/MONGO_TO_POSTGRES_MIGRATION.md`. That plan's phase
list (payment → menu → inventory → order) shrinks to
(payment → catalog → order) once this consolidation lands, and the
Supabase connection budget only has to cover 4 services instead of 6.

## Risks

- Any hardcoded tenant-service or inventory-service URLs (frontend env
  vars, Helm values, ingress rules, other services' `appsettings.json`)
  need to be found and updated — a grep-based audit before deleting
  either service is required, not optional.
- Combining controllers/logic into identity and menu increases each
  service's blast radius — a bug in onboarding logic now can affect auth
  uptime, and a bug in inventory logic can affect menu availability.
  Acceptable trade for a project at this scale, but worth naming
  explicitly.
- Confirm no other consumer depends on inventory's local `menuitems`
  copy's exact shape/collection name before deleting it.
