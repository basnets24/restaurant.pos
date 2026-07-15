using System.Linq.Expressions;

namespace Common.Library.PostgreSQL;

/// <summary>
/// Generic repository interface for Entity Framework Core (PostgreSQL).
/// Mirrors the MongoDB IRepository pattern for consistency.
/// </summary>
public interface IEfRepository<T> where T : class
{
    /// <summary>Gets queryable representation of entity set for advanced queries.</summary>
    IQueryable<T> AsQueryable();

    /// <summary>Get entity by primary key.</summary>
    Task<T?> GetByIdAsync(object id);

    /// <summary>Get all entities.</summary>
    Task<IReadOnlyList<T>> GetAllAsync();

    /// <summary>Get all entities matching filter.</summary>
    Task<IReadOnlyList<T>> GetAsync(Expression<Func<T, bool>> filter);

    /// <summary>Get single entity matching filter, or null.</summary>
    Task<T?> GetSingleAsync(Expression<Func<T, bool>> filter);

    /// <summary>Add new entity.</summary>
    Task AddAsync(T entity);

    /// <summary>Update existing entity.</summary>
    Task UpdateAsync(T entity);

    /// <summary>Delete entity by primary key.</summary>
    Task DeleteAsync(object id);

    /// <summary>Delete entity.</summary>
    Task DeleteAsync(T entity);

    /// <summary>Save changes to database.</summary>
    Task SaveChangesAsync();
}
