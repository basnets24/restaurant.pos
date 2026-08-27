using System.Linq.Expressions;
using Microsoft.EntityFrameworkCore;

namespace Common.Library.PostgreSQL;

/// <summary>
/// Generic Entity Framework Core repository implementation for PostgreSQL.
/// Provides standard CRUD operations and query support.
/// </summary>
public class EfRepository<T> : IEfRepository<T> where T : class
{
    protected readonly DbContext Context;
    protected readonly DbSet<T> DbSet;

    public EfRepository(DbContext context)
    {
        Context = context ?? throw new ArgumentNullException(nameof(context));
        DbSet = context.Set<T>();
    }

    public IQueryable<T> AsQueryable() => DbSet.AsQueryable();

    public async Task<T?> GetByIdAsync(object id)
    {
        ArgumentNullException.ThrowIfNull(id);
        return await DbSet.FindAsync(id);
    }

    public async Task<IReadOnlyList<T>> GetAllAsync()
    {
        return await DbSet.ToListAsync();
    }

    public async Task<IReadOnlyList<T>> GetAsync(Expression<Func<T, bool>> filter)
    {
        ArgumentNullException.ThrowIfNull(filter);
        return await DbSet.Where(filter).ToListAsync();
    }

    public async Task<T?> GetSingleAsync(Expression<Func<T, bool>> filter)
    {
        ArgumentNullException.ThrowIfNull(filter);
        return await DbSet.FirstOrDefaultAsync(filter);
    }

    public async Task AddAsync(T entity)
    {
        ArgumentNullException.ThrowIfNull(entity);
        await DbSet.AddAsync(entity);
        await SaveChangesAsync();
    }

    public async Task UpdateAsync(T entity)
    {
        ArgumentNullException.ThrowIfNull(entity);
        DbSet.Update(entity);
        await SaveChangesAsync();
    }

    public async Task DeleteAsync(object id)
    {
        ArgumentNullException.ThrowIfNull(id);
        var entity = await GetByIdAsync(id);
        if (entity != null)
        {
            await DeleteAsync(entity);
        }
    }

    public async Task DeleteAsync(T entity)
    {
        ArgumentNullException.ThrowIfNull(entity);
        DbSet.Remove(entity);
        await SaveChangesAsync();
    }

    public async Task SaveChangesAsync()
    {
        await Context.SaveChangesAsync();
    }
}
