using System.Linq.Expressions;
using Common.Library.Tenancy;
using Microsoft.EntityFrameworkCore;

namespace Common.Library.PostgreSQL;

/// <summary>
/// EF Core-backed IRepository{T} implementation for tenant-scoped entities - the
/// Postgres equivalent of TenantMongoRepository{T}. Tenant filtering on reads comes
/// from a global query filter configured on the DbContext's model (see
/// TenantModelBuilderExtensions.ApplyTenantQueryFilters); this class only stamps
/// RestaurantId/LocationId on writes, mirroring the Mongo repo's write-side behavior.
/// </summary>
public class TenantEfRepository<T> : IRepository<T>
    where T : class, IEntity, ITenantEntity
{
    private readonly DbContext _context;
    private readonly DbSet<T> _set;
    private readonly ITenantContext _tenant;

    public TenantEfRepository(DbContext context, ITenantContext tenant)
    {
        _context = context ?? throw new ArgumentNullException(nameof(context));
        _tenant = tenant ?? throw new ArgumentNullException(nameof(tenant));
        _set = context.Set<T>();
    }

    public async Task<IReadOnlyCollection<T>> GetAllAsync() =>
        await _set.ToListAsync();

    public async Task<IReadOnlyCollection<T>> GetAllAsync(Expression<Func<T, bool>> filter) =>
        await _set.Where(filter).ToListAsync();

    // Deliberately not using DbSet.FindAsync: Find's interaction with global query
    // filters has been inconsistent across EF Core versions - Where().FirstOrDefaultAsync()
    // always goes through the filter.
    public async Task<T> GetAsync(Guid id) =>
        (await _set.Where(e => e.Id == id).FirstOrDefaultAsync())!;

    public async Task<T> GetAsync(Expression<Func<T, bool>> filter) =>
        (await _set.Where(filter).FirstOrDefaultAsync())!;

    public async Task CreateAsync(T entity)
    {
        entity.RestaurantId = _tenant.RestaurantId;
        entity.LocationId = _tenant.LocationId;
        await _set.AddAsync(entity);
        await _context.SaveChangesAsync();
    }

    public async Task UpdateAsync(T entity)
    {
        entity.RestaurantId = _tenant.RestaurantId;
        entity.LocationId = _tenant.LocationId;
        _set.Update(entity);
        await _context.SaveChangesAsync();
    }

    public async Task DeleteAsync(Guid id)
    {
        var entity = await GetAsync(id);
        if (entity is not null)
        {
            _set.Remove(entity);
            await _context.SaveChangesAsync();
        }
    }
}
