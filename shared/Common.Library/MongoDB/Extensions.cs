using Common.Library.Settings;
using Common.Library.Tenancy;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using MongoDB.Bson;
using MongoDB.Bson.Serialization;
using MongoDB.Bson.Serialization.Serializers;
using MongoDB.Driver;

namespace Common.Library.MongoDB;

public static class Extensions
{
    public static IServiceCollection AddMongo(this IServiceCollection services
        )
    {
        BsonSerializer.RegisterSerializer(new GuidSerializer(BsonType.String));
        BsonSerializer.RegisterSerializer(new DateTimeOffsetSerializer(BsonType.String));
        
        services.AddSingleton<IMongoClient>(serviceProvider =>
        {
            var configuration = serviceProvider.GetRequiredService<IConfiguration>();
            var mongoDbSettings = configuration.GetRequiredSection(nameof(MongoDbSettings)).Get<MongoDbSettings>();
            return new MongoClient(mongoDbSettings!.GetConnectionString());
        }); 
        
        services.AddSingleton(serviceProvider =>
        {
            var configuration = serviceProvider.GetRequiredService<IConfiguration>();
            var mongoDbSettings = configuration.GetRequiredSection(nameof(MongoDbSettings)).Get<MongoDbSettings>();
            var serviceSettings = configuration.GetRequiredSection(nameof(ServiceSettings)).Get<ServiceSettings>(); 
            var mongoClient = serviceProvider.GetRequiredService<IMongoClient>();

            // Use provided DatabaseName or fallback to ServiceName
            var dbName = !string.IsNullOrWhiteSpace(mongoDbSettings!.DatabaseName)
                ? mongoDbSettings.DatabaseName
                : configuration.GetRequiredSection(nameof(ServiceSettings)).Get<ServiceSettings>()?.ServiceName
                  ?? throw new InvalidOperationException("No MongoDbSettings.DatabaseName or ServiceSettings.ServiceName provided.");

            return mongoClient.GetDatabase(dbName);
        });
        
        return services; 
    }
    
    public static IServiceCollection AddMongoRepository<T>
        (this IServiceCollection services, string collectionName) where T : IEntity
    {
        services.AddSingleton<IRepository<T>>(serviceProvider =>
        {
            var database = serviceProvider.GetRequiredService<IMongoDatabase>();
            return new MongoRepository<T>(database, collectionName);
        }); 
        return services;
    }
    
    public static IServiceCollection AddTenantMongoRepository<T>(this IServiceCollection services, 
        string collectionName)
        where T : class, IEntity, ITenantEntity
    {
        services.AddScoped<IRepository<T>>(sp =>
        {
            var db = sp.GetRequiredService<IMongoDatabase>();
            var tenant = sp.GetRequiredService<ITenantContext>();
            return new TenantMongoRepository<T>(db, tenant, collectionName);
        });
        return services;
    }
}