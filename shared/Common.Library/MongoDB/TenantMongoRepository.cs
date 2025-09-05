// MongoDB/TenantMongoRepository.cs
using System.Linq.Expressions;
using Common.Library;
using Common.Library.Tenancy;
using MongoDB.Driver;

namespace Common.Library.MongoDB;

public class TenantMongoRepository<T> : IRepository<T> where T : IEntity, ITenantEntity
{
    private readonly IMongoCollection<T> _col;
    private readonly FilterDefinitionBuilder<T> _f = Builders<T>.Filter;
    private readonly ITenantContext _tenant;

    public TenantMongoRepository(IMongoDatabase db, 
        ITenantContext tenant, 
        string collectionName)
    {
        _col = db.GetCollection<T>(collectionName);
        _tenant = tenant;

        // helpful compound index for tenant scoping
        _col.Indexes.CreateOne(new CreateIndexModel<T>(
            Builders<T>.IndexKeys.Ascending(x => x.RestaurantId).Ascending(x => x.LocationId)));
    }

    private FilterDefinition<T> Scope(FilterDefinition<T>? extra = null)
    {
        var scope = _f.Eq(x => x.RestaurantId, _tenant.RestaurantId) &
                    _f.Eq(x => x.LocationId, _tenant.LocationId);
        // if extra filter(id) is null, just return the scope 
        return extra is null ? scope : scope & extra;
    }

    public async Task<IReadOnlyCollection<T>> GetAllAsync() =>
        await _col.Find(Scope()).ToListAsync();

    public async Task<IReadOnlyCollection<T>> GetAllAsync(Expression<Func<T, bool>> filter) =>
        await _col.Find(Scope(_f.Where(filter))).ToListAsync();

    public async Task<T> GetAsync(Guid id) =>
        await _col.Find(Scope(_f.Eq(x => x.Id, id))).FirstOrDefaultAsync();

    public async Task<T> GetAsync(Expression<Func<T, bool>> filter) =>
        await _col.Find(Scope(_f.Where(filter))).FirstOrDefaultAsync();

    public async Task CreateAsync(T entity)
    {
        entity.RestaurantId = _tenant.RestaurantId;
        entity.LocationId   = _tenant.LocationId;
        await _col.InsertOneAsync(entity);
    }

    public async Task UpdateAsync(T entity)
    {
        entity.RestaurantId = _tenant.RestaurantId;
        entity.LocationId   = _tenant.LocationId;
        var byId = _f.Eq(x => x.Id, entity.Id);
        await _col.ReplaceOneAsync(Scope(byId), entity);
    }

    public async Task DeleteAsync(Guid id)
    {
        var byId = _f.Eq(x => x.Id, id);
        await _col.DeleteOneAsync(Scope(byId));
    }
}
