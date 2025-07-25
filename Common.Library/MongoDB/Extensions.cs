using Common.Library.Settings;
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
            var serviceSettings = configuration.GetRequiredSection(nameof(ServiceSettings)).Get<ServiceSettings>(); 
            var mongoClient = serviceProvider.GetRequiredService<IMongoClient>();
            return mongoClient.GetDatabase(serviceSettings!.ServiceName);
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
}