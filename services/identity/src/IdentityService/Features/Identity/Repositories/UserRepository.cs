using Common.Library.PostgreSQL;
using IdentityService.Features.Identity.Models;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace IdentityService.Features.Identity.Repositories;

public class UserRepository : EfRepository<ApplicationUser>, IUserRepository
{
    private readonly UserManager<ApplicationUser> _userManager;

    public UserRepository(DbContext context, UserManager<ApplicationUser> userManager)
        : base(context)
    {
        _userManager = userManager ?? throw new ArgumentNullException(nameof(userManager));
    }

    public async Task<ApplicationUser?> GetByEmailAsync(string email, CancellationToken ct = default)
    {
        ArgumentNullException.ThrowIfNull(email);
        return await DbSet
            .AsNoTracking()
            .FirstOrDefaultAsync(u => u.Email == email, ct);
    }

    public async Task<(IReadOnlyList<ApplicationUser> Items, long Total)> GetByRolePagedAsync(
        string role,
        int page,
        int pageSize,
        CancellationToken ct = default)
    {
        ArgumentNullException.ThrowIfNull(role);

        var usersInRole = await _userManager.GetUsersInRoleAsync(role);
        var usersQuery = usersInRole.AsQueryable();

        var total = usersQuery.LongCount();
        var items = usersQuery
            .OrderBy(u => u.UserName)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToList();

        return (items, total);
    }

    public async Task<(IReadOnlyList<ApplicationUser> Items, long Total)> SearchPagedAsync(
        string? searchTerm,
        string? role,
        int page,
        int pageSize,
        CancellationToken ct = default)
    {
        page = page < 1 ? 1 : page;
        pageSize = pageSize is < 1 or > 200 ? 25 : pageSize;

        IQueryable<ApplicationUser> query = DbSet.AsNoTracking();

        if (!string.IsNullOrWhiteSpace(role))
        {
            var usersInRole = await _userManager.GetUsersInRoleAsync(role);
            var userIds = usersInRole.Select(u => u.Id).ToList();
            query = query.Where(u => userIds.Contains(u.Id));
        }

        if (!string.IsNullOrWhiteSpace(searchTerm))
        {
            var term = searchTerm.Trim();
            query = query.Where(u =>
                EF.Functions.Like(u.UserName ?? "", $"%{term}%") ||
                EF.Functions.Like(u.Email ?? "", $"%{term}%") ||
                EF.Functions.Like(u.DisplayName ?? "", $"%{term}%"));
        }

        var total = await query.LongCountAsync(ct);

        var items = await query
            .OrderBy(u => u.UserName)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(ct);

        return (items, total);
    }
}
