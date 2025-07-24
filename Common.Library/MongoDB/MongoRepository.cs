
using System.Linq.Expressions;
using MongoDB.Driver;

namespace Common.Library.MongoDB; 

public class MongoRepository<T> : IRepository<T> where T : IEntity
{
    
    private readonly IMongoCollection<T> dbcollection;
    private readonly FilterDefinitionBuilder<T> filterBuilder = Builders<T>.Filter;

    public MongoRepository(IMongoDatabase database, string collectionName)
    {
        dbcollection = database.GetCollection<T>(collectionName);
    }
    
    public async Task<IReadOnlyCollection<T>> GetAllAsync()
    {
        return await dbcollection.Find(filterBuilder.Empty).ToListAsync();
    }

    public async Task<IReadOnlyCollection<T>> GetAllAsync(Expression<Func<T, bool>> filter)
    {
        return await dbcollection.Find(filter).ToListAsync();
    }

    // find a single
    public async Task<T> GetAsync(Guid id)
    {
        FilterDefinition<T> filter = filterBuilder.Eq(entity => entity.Id, id);
        return await dbcollection.Find(filter).FirstOrDefaultAsync();
    }

    public async Task<T> GetAsync(Expression<Func<T, bool>> filter)
    {
        return await dbcollection.Find(filter).FirstOrDefaultAsync();
    }

    //create 
    public async Task CreateAsync(T entity)
    {
        if (entity == null)
        {
            throw new ArgumentNullException(nameof(entity));
        }
        await dbcollection.InsertOneAsync(entity);
    }

    public async Task UpdateAsync(T entity)
    {
        if (entity == null)
        {
            throw new ArgumentNullException(nameof(entity));
        }

        var filter = filterBuilder.Eq(entity => entity.Id, entity.Id); 
        await dbcollection.ReplaceOneAsync(filter, entity);
    }

    public async Task DeleteAsync(Guid id)
    {
        var filter = filterBuilder.Eq(entity => entity.Id, id);
        await dbcollection.DeleteOneAsync(filter);
    }

}