
using System.Linq.Expressions;
using MongoDB.Driver;

namespace Common.Library.MongoDB; 

public class MongoRepository<T> : IRepository<T> where T : IEntity
{
    
    private readonly IMongoCollection<T> _dbcollection;
    private readonly FilterDefinitionBuilder<T> _filterBuilder = Builders<T>.Filter;

    public MongoRepository(IMongoDatabase database, string collectionName)
    {
        _dbcollection = database.GetCollection<T>(collectionName);
    }
    
    public async Task<IReadOnlyCollection<T>> GetAllAsync()
    {
        return await _dbcollection.Find(_filterBuilder.Empty).ToListAsync();
    }

    public async Task<IReadOnlyCollection<T>> GetAllAsync(Expression<Func<T, bool>> filter)
    {
        return await _dbcollection.Find(filter).ToListAsync();
    }

    // find a single
    public async Task<T> GetAsync(Guid id)
    {
        FilterDefinition<T> filter = _filterBuilder.Eq(entity => entity.Id, id);
        return await _dbcollection.Find(filter).FirstOrDefaultAsync();
    }

    public async Task<T> GetAsync(Expression<Func<T, bool>> filter)
    {
        return await _dbcollection.Find(filter).FirstOrDefaultAsync();
    }

    //create 
    public async Task CreateAsync(T entity)
    {
        if (entity == null)
        {
            throw new ArgumentNullException(nameof(entity));
        }
        await _dbcollection.InsertOneAsync(entity);
    }

    public async Task UpdateAsync(T entity)
    {
        if (entity == null)
        {
            throw new ArgumentNullException(nameof(entity));
        }

        var filter = _filterBuilder.Eq(entity => entity.Id, entity.Id); 
        await _dbcollection.ReplaceOneAsync(filter, entity);
    }

    public async Task DeleteAsync(Guid id)
    {
        var filter = _filterBuilder.Eq(entity => entity.Id, id);
        await _dbcollection.DeleteOneAsync(filter);
    }

}