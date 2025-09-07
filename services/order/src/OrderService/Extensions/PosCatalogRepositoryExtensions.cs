using Common.Library.MongoDB;
using MongoDB.Driver;
using OrderService.Entities;
using OrderService.Projections;

namespace OrderService.Extensions;

public static class PosCatalogRepositoryExtensions
{
    public static IServiceCollection AddPosCatalogReadModel(
        this IServiceCollection services,
        string collectionName = "pos-catalog-items")
    {
        services.AddSingleton<IMongoCollection<PosCatalogItem>>(sp =>
        {
            var db  = sp.GetRequiredService<IMongoDatabase>();
            var col = db.GetCollection<PosCatalogItem>(collectionName);

            col.Indexes.CreateMany(new[]
            {
                // for availability 
                new CreateIndexModel<PosCatalogItem>(
                    Builders<PosCatalogItem>.IndexKeys
                        .Ascending(x => x.RestaurantId)
                        .Ascending(x => x.LocationId)
                        .Ascending(x => x.IsAvailable)),
                // for menu search 
                new CreateIndexModel<PosCatalogItem>(
                    Builders<PosCatalogItem>.IndexKeys
                        .Ascending(x => x.RestaurantId)
                        .Ascending(x => x.LocationId)
                        .Ascending(x => x.Category)
                        .Ascending(x => x.Name))
            });

            return col;
        });

        return services;
    }
}
