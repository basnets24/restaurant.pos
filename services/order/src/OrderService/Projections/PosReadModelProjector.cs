using Common.Library.Tenancy;
using MassTransit;
using Messaging.Contracts.Events.Inventory;
using Messaging.Contracts.Events.Menu;
using MongoDB.Driver;

// Adjust the namespace to your service
namespace OrderService.Projections
{
    // Compact POS read model (unified on MenuItemId)
    public sealed class PosCatalogItem
    {
        public Guid   MenuItemId      { get; set; }
        public string RestaurantId    { get; set; } = default!;
        public string? LocationId     { get; set; }

        public string  Name           { get; set; } = default!;
        public string  Category       { get; set; } = "Uncategorized";
        public decimal BasePrice      { get; set; }

        public int   Quantity             { get; set; }
        public bool  MenuAvailable        { get; set; }
        public bool  InventoryAvailable   { get; set; }
        public bool  IsAvailable          { get; set; }

        // Optional version guards (for Menu/Inventory add versions later)
        public long MenuVersion       { get; set; }
        public long InventoryVersion  { get; set; }

        public DateTimeOffset UpdatedAt { get; set; }
    }

    // ---- Projector (single consumer class; one receive endpoint) ----
    public sealed class PosReadModelProjector :
        IConsumer<MenuItemCreated>,
        IConsumer<MenuItemUpdated>,
        IConsumer<MenuItemDeleted>,
        IConsumer<InventoryItemUpdated>,
        IConsumer<InventoryItemDepleted>,
        IConsumer<InventoryItemRestocked>
    {
        private readonly IMongoCollection<PosCatalogItem> _col;
        private readonly ITenantContext _tenant;

        public PosReadModelProjector(IMongoDatabase db, ITenantContext tenant)
        {
            _col = db.GetCollection<PosCatalogItem>("pos-catalog-items");
            _tenant = tenant;
        }

        // -------------- MENU --------------

        public async Task Consume(ConsumeContext<MenuItemCreated> ctx)
        {
            var e = ctx.Message;
            if (!SameTenant(e.RestaurantId, e.LocationId)) return;

            var filter = Key(e.Id, e.RestaurantId, e.LocationId);

            var update = Builders<PosCatalogItem>.Update
                .SetOnInsert(x => x.MenuItemId,   e.Id)
                .SetOnInsert(x => x.RestaurantId, e.RestaurantId)
                .SetOnInsert(x => x.LocationId,   e.LocationId)
                .Set(x => x.Name,          e.Name)
                .Set(x => x.Category,      e.Category)
                .Set(x => x.BasePrice,     e.Price)
                .Set(x => x.MenuAvailable, e.IsAvailable)
                .CurrentDate(x => x.UpdatedAt);

            await _col.UpdateOneAsync(filter, update, new UpdateOptions { IsUpsert = true });
            await RecomputeIsAvailable(e.Id, e.RestaurantId, e.LocationId);
        }

        public async Task Consume(ConsumeContext<MenuItemUpdated> ctx)
        {
            var e = ctx.Message;
            if (!SameTenant(e.RestaurantId, e.LocationId)) return;

            var filter = Key(e.Id, e.RestaurantId, e.LocationId);

            var update = Builders<PosCatalogItem>.Update
                .Set(x => x.Name,          e.Name)
                .Set(x => x.Category,      e.Category)
                .Set(x => x.BasePrice,     e.Price)
                .Set(x => x.MenuAvailable, e.IsAvailable)
                .CurrentDate(x => x.UpdatedAt);

            await _col.UpdateOneAsync(filter, update, new UpdateOptions { IsUpsert = true });
            await RecomputeIsAvailable(e.Id, e.RestaurantId, e.LocationId);
        }

        public async Task Consume(ConsumeContext<MenuItemDeleted> ctx)
        {
            var e = ctx.Message;
            if (!SameTenant(e.RestaurantId, e.LocationId)) return;

            await _col.DeleteOneAsync(Key(e.Id, e.RestaurantId, e.LocationId));
        }

        // ----------- INVENTORY -----------

        public async Task Consume(ConsumeContext<InventoryItemUpdated> ctx)
        {
            var e = ctx.Message;
            if (!SameTenant(e.RestaurantId, e.LocationId)) return;

            var filter = Key(e.MenuItemId, e.RestaurantId, e.LocationId);

            var update = Builders<PosCatalogItem>.Update
                .Set(x => x.Quantity,           e.Quantity)
                .Set(x => x.InventoryAvailable, e.IsAvailable)
                .CurrentDate(x => x.UpdatedAt);

            await _col.UpdateOneAsync(filter, update, new UpdateOptions { IsUpsert = true });
            await RecomputeIsAvailable(e.MenuItemId, e.RestaurantId, e.LocationId);
        }

        public async Task Consume(ConsumeContext<InventoryItemDepleted> ctx)
        {
            var e = ctx.Message;
            if (!SameTenant(e.RestaurantId, e.LocationId)) return;

            var filter = Key(e.MenuItemId, e.RestaurantId, e.LocationId);

            var update = Builders<PosCatalogItem>.Update
                .Set(x => x.Quantity,           e.NewQuantity)     // typically 0
                .Set(x => x.InventoryAvailable, e.IsAvailable)     // typically false
                .CurrentDate(x => x.UpdatedAt);

            await _col.UpdateOneAsync(filter, update, new UpdateOptions { IsUpsert = true });
            await RecomputeIsAvailable(e.MenuItemId, e.RestaurantId, e.LocationId);
        }

        public async Task Consume(ConsumeContext<InventoryItemRestocked> ctx)
        {
            var e = ctx.Message;
            if (!SameTenant(e.RestaurantId, e.LocationId)) return;

            var filter = Key(e.MenuItemId, e.RestaurantId, e.LocationId);

            var update = Builders<PosCatalogItem>.Update
                .Set(x => x.Quantity,           e.NewQuantity)
                .Set(x => x.InventoryAvailable, e.IsAvailable)     // often true when restocked
                .CurrentDate(x => x.UpdatedAt);

            await _col.UpdateOneAsync(filter, update, new UpdateOptions { IsUpsert = true });
            await RecomputeIsAvailable(e.MenuItemId, e.RestaurantId, e.LocationId);
        }

        // -------------- HELPERS --------------

        // combines menu id + restaurant + location for unique key 
        private static FilterDefinition<PosCatalogItem> Key(Guid menuItemId, string r, string? l) =>
            Builders<PosCatalogItem>.Filter.Where(x =>
                x.MenuItemId == menuItemId && x.RestaurantId == r && x.LocationId == l);

        //ensure same tenant 
        private bool SameTenant(string r, string? l) =>
            r == _tenant.RestaurantId && l == _tenant.LocationId;

        // combines the availability flag from menu, inventory & quantity 
        // to create a single flag for query 
        private async Task RecomputeIsAvailable(Guid menuItemId, string r, string? l)
        {
            var filter = Key(menuItemId, r, l);
            var item = await _col.Find(filter).FirstOrDefaultAsync();
            if (item is null) return;

            var isAvail = item.MenuAvailable && item.InventoryAvailable && item.Quantity > 0;

            await _col.UpdateOneAsync(filter,
                Builders<PosCatalogItem>.Update.Set(x => x.IsAvailable, isAvail));
        }
    }
}
