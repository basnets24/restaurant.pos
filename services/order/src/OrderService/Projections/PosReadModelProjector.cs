using Common.Library;
using Common.Library.Tenancy;
using MassTransit;
using Messaging.Contracts.Events.Inventory;
using Messaging.Contracts.Events.Menu;
using Microsoft.EntityFrameworkCore;
using OrderService.Data;

namespace OrderService.Projections
{
    // Compact POS read model (unified on Id == MenuItemId)
    public sealed class PosCatalogItem : IEntity, ITenantEntity
    {
        public Guid Id { get; set; }
        public string RestaurantId { get; set; } = default!;
        public string LocationId { get; set; } = default!;

        public string Name { get; set; } = default!;
        public string Category { get; set; } = "Uncategorized";
        public decimal BasePrice { get; set; }

        public int Quantity { get; set; }
        public bool MenuAvailable { get; set; }
        public bool InventoryAvailable { get; set; }
        public bool IsAvailable { get; set; }

        // Optional version guards (for Menu/Inventory add versions later)
        public long MenuVersion { get; set; }
        public long InventoryVersion { get; set; }

        public DateTimeOffset UpdatedAt { get; set; }
    }

    // ---- Projector (single consumer class; one receive endpoint) ----
    // Every handler is a single atomic INSERT ... ON CONFLICT DO UPDATE against
    // Postgres - unlike the previous Mongo implementation, IsAvailable is folded
    // into the same statement as a SQL expression instead of a separate
    // read-then-write recompute step, closing a race that existed even in Mongo.
    public sealed class PosReadModelProjector :
        IConsumer<MenuItemCreated>,
        IConsumer<MenuItemUpdated>,
        IConsumer<MenuItemDeleted>,
        IConsumer<InventoryItemUpdated>,
        IConsumer<InventoryItemDepleted>,
        IConsumer<InventoryItemRestocked>
    {
        private readonly OrderDbContext _db;
        private readonly ITenantContext _tenant;

        public PosReadModelProjector(OrderDbContext db, ITenantContext tenant)
        {
            _db = db;
            _tenant = tenant;
        }

        // -------------- MENU --------------

        public Task Consume(ConsumeContext<MenuItemCreated> ctx) => UpsertMenuSide(
            ctx.Message.Id, ctx.Message.RestaurantId, ctx.Message.LocationId,
            ctx.Message.Name, ctx.Message.Category, ctx.Message.Price, ctx.Message.IsAvailable);

        public Task Consume(ConsumeContext<MenuItemUpdated> ctx) => UpsertMenuSide(
            ctx.Message.Id, ctx.Message.RestaurantId, ctx.Message.LocationId,
            ctx.Message.Name, ctx.Message.Category, ctx.Message.Price, ctx.Message.IsAvailable);

        public async Task Consume(ConsumeContext<MenuItemDeleted> ctx)
        {
            var e = ctx.Message;
            if (!SameTenant(e.RestaurantId, e.LocationId)) return;
            var location = NormalizeLocation(e.LocationId);

            await _db.Database.ExecuteSqlInterpolatedAsync(
                $"""
                 DELETE FROM "order"."PosCatalogItems"
                 WHERE "Id" = {e.Id} AND "RestaurantId" = {e.RestaurantId} AND "LocationId" = {location}
                 """);
        }

        // ----------- INVENTORY -----------

        public Task Consume(ConsumeContext<InventoryItemUpdated> ctx) => UpsertInventorySide(
            ctx.Message.MenuItemId, ctx.Message.RestaurantId, ctx.Message.LocationId,
            ctx.Message.Quantity, ctx.Message.IsAvailable);

        public Task Consume(ConsumeContext<InventoryItemDepleted> ctx) => UpsertInventorySide(
            ctx.Message.MenuItemId, ctx.Message.RestaurantId, ctx.Message.LocationId,
            ctx.Message.NewQuantity, ctx.Message.IsAvailable);

        public Task Consume(ConsumeContext<InventoryItemRestocked> ctx) => UpsertInventorySide(
            ctx.Message.MenuItemId, ctx.Message.RestaurantId, ctx.Message.LocationId,
            ctx.Message.NewQuantity, ctx.Message.IsAvailable);

        // -------------- HELPERS --------------

        // MenuItemCreated and MenuItemUpdated collapse to the same statement - the
        // old Mongo SetOnInsert-vs-Set split only mattered because Mongo
        // auto-populates filter-key fields on upsert-insert; Postgres has no
        // equivalent, so the INSERT column list always supplies Id/RestaurantId/
        // LocationId explicitly regardless of event type.
        private async Task UpsertMenuSide(Guid id, string restaurantId, string? locationId,
            string name, string category, decimal price, bool menuAvailable)
        {
            if (!SameTenant(restaurantId, locationId)) return;
            var location = NormalizeLocation(locationId);
            var updatedAt = DateTimeOffset.UtcNow;

            await _db.Database.ExecuteSqlInterpolatedAsync(
                $"""
                 INSERT INTO "order"."PosCatalogItems" AS p
                     ("Id","RestaurantId","LocationId","Name","Category","BasePrice","MenuAvailable",
                      "Quantity","InventoryAvailable","IsAvailable","MenuVersion","InventoryVersion","UpdatedAt")
                 VALUES
                     ({id},{restaurantId},{location},{name},{category},{price},{menuAvailable},
                      0,false,false,0,0,{updatedAt})
                 ON CONFLICT ("Id") DO UPDATE SET
                     "Name" = {name},
                     "Category" = {category},
                     "BasePrice" = {price},
                     "MenuAvailable" = {menuAvailable},
                     "IsAvailable" = (p."InventoryAvailable" AND {menuAvailable} AND p."Quantity" > 0),
                     "UpdatedAt" = {updatedAt}
                 """);
        }

        // Shared by InventoryItemUpdated/Depleted/Restocked - only the source of
        // the quantity value differs at the call site (Quantity vs NewQuantity).
        private async Task UpsertInventorySide(Guid menuItemId, string restaurantId, string? locationId,
            int quantity, bool inventoryAvailable)
        {
            if (!SameTenant(restaurantId, locationId)) return;
            var location = NormalizeLocation(locationId);
            var updatedAt = DateTimeOffset.UtcNow;

            await _db.Database.ExecuteSqlInterpolatedAsync(
                $"""
                 INSERT INTO "order"."PosCatalogItems" AS p
                     ("Id","RestaurantId","LocationId","Name","Category","BasePrice","MenuAvailable",
                      "Quantity","InventoryAvailable","IsAvailable","MenuVersion","InventoryVersion","UpdatedAt")
                 VALUES
                     ({menuItemId},{restaurantId},{location},'','Uncategorized',0,false,
                      {quantity},{inventoryAvailable},false,0,0,{updatedAt})
                 ON CONFLICT ("Id") DO UPDATE SET
                     "Quantity" = {quantity},
                     "InventoryAvailable" = {inventoryAvailable},
                     "IsAvailable" = (p."MenuAvailable" AND {inventoryAvailable} AND {quantity} > 0),
                     "UpdatedAt" = {updatedAt}
                 """);
        }

        private bool SameTenant(string r, string? l) =>
            r == _tenant.RestaurantId && NormalizeLocation(l) == NormalizeLocation(_tenant.LocationId);

        private static string NormalizeLocation(string? location) => location ?? string.Empty;
    }
}
