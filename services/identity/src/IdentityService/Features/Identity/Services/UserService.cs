using System.Security.Claims;
using IdentityService.Features.Identity.DTOs;
using IdentityService.Features.Identity.Models;
using IdentityService.Features.Identity.Repositories;
using IdentityService.Features.Shared.DTOs;
using Microsoft.AspNetCore.Identity;

namespace IdentityService.Features.Identity.Services;

public class UserService : IUserService
{
    private readonly IUserRepository _userRepository;
    private readonly UserManager<ApplicationUser> _userManager;
    private readonly RoleManager<ApplicationRole> _roleManager;
    private readonly ILogger<UserService> _logger;

    public UserService(
        IUserRepository userRepository,
        UserManager<ApplicationUser> userManager,
        RoleManager<ApplicationRole> roleManager,
        ILogger<UserService> logger)
    {
        _userRepository = userRepository ?? throw new ArgumentNullException(nameof(userRepository));
        _userManager = userManager ?? throw new ArgumentNullException(nameof(userManager));
        _roleManager = roleManager ?? throw new ArgumentNullException(nameof(roleManager));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    public async Task<UserDto?> GetMeAsync(ClaimsPrincipal user, CancellationToken ct = default)
    {
        ArgumentNullException.ThrowIfNull(user);

        var appUser = await _userManager.GetUserAsync(user);
        if (appUser is null)
        {
            _logger.LogWarning("User {UserId} not found", user.FindFirstValue(ClaimTypes.NameIdentifier));
            return null;
        }

        var roles = await _userManager.GetRolesAsync(appUser);
        return appUser.ToUserDto(roles);
    }

    public async Task<Paged<UserListItemDto>> ListUsersAsync(UsersQuery query, CancellationToken ct = default)
    {
        ArgumentNullException.ThrowIfNull(query);

        var (items, total) = await _userRepository.SearchPagedAsync(
            query.Username,
            query.Role,
            query.Page,
            query.PageSize,
            ct);

        var dtoItems = new List<UserListItemDto>();
        foreach (var user in items)
        {
            var roles = await _userManager.GetRolesAsync(user);
            var lockedOut = user.LockoutEnd.HasValue && user.LockoutEnd > DateTimeOffset.UtcNow;
            dtoItems.Add(new UserListItemDto(
                user.Id,
                user.Email,
                user.UserName,
                user.DisplayName,
                user.EmailConfirmed,
                lockedOut,
                roles));
        }

        return new Paged<UserListItemDto>(dtoItems, query.Page, query.PageSize, total);
    }

    public async Task<UserDetailDto?> GetByIdAsync(Guid userId, CancellationToken ct = default)
    {
        var user = await _userRepository.GetByIdAsync(userId);
        if (user is null)
        {
            _logger.LogWarning("User {UserId} not found", userId);
            return null;
        }

        var roles = await _userManager.GetRolesAsync(user);
        var lockedOut = user.LockoutEnd.HasValue && user.LockoutEnd > DateTimeOffset.UtcNow;

        return new UserDetailDto(
            user.Id,
            user.Email,
            user.UserName,
            user.DisplayName,
            user.EmailConfirmed,
            user.LockoutEnabled,
            lockedOut,
            user.AccessFailedCount,
            user.TwoFactorEnabled,
            user.LockoutEnd,
            roles);
    }

    public async Task UpdateAsync(Guid userId, UserUpdateDto dto, CancellationToken ct = default)
    {
        ArgumentNullException.ThrowIfNull(dto);

        var user = await _userRepository.GetByIdAsync(userId);
        if (user is null)
        {
            throw new KeyNotFoundException($"User {userId} not found");
        }

        if (!string.IsNullOrWhiteSpace(dto.UserName))
        {
            user.UserName = dto.UserName.Trim();
            user.NormalizedUserName = user.UserName.ToUpperInvariant();
        }

        if (!string.IsNullOrWhiteSpace(dto.Email))
        {
            user.Email = dto.Email.Trim();
            user.NormalizedEmail = user.Email.ToUpperInvariant();
        }

        if (!string.IsNullOrWhiteSpace(dto.DisplayName))
        {
            user.DisplayName = dto.DisplayName.Trim();
        }

        if (dto.AccessCode is not null)
            user.AccessCode = dto.AccessCode;
        if (dto.LockoutEnabled.HasValue)
            user.LockoutEnabled = dto.LockoutEnabled.Value;
        if (dto.LockoutEnd.HasValue)
            user.LockoutEnd = dto.LockoutEnd.Value;
        if (dto.TwoFactorEnabled.HasValue)
            user.TwoFactorEnabled = dto.TwoFactorEnabled.Value;

        var result = await _userManager.UpdateAsync(user);
        if (!result.Succeeded)
        {
            var errors = string.Join("; ", result.Errors.Select(e => e.Description));
            throw new InvalidOperationException($"Failed to update user: {errors}");
        }

        _logger.LogInformation("User {UserId} updated", userId);
    }

    public async Task DisableAsync(Guid userId, CancellationToken ct = default)
    {
        var user = await _userRepository.GetByIdAsync(userId);
        if (user is null)
        {
            throw new KeyNotFoundException($"User {userId} not found");
        }

        var roles = await _userManager.GetRolesAsync(user);
        if (roles.Contains("Admin"))
        {
            throw new InvalidOperationException("Cannot disable an Admin user");
        }

        user.LockoutEnabled = true;
        user.LockoutEnd = DateTimeOffset.MaxValue;

        var result = await _userManager.UpdateAsync(user);
        if (!result.Succeeded)
        {
            var errors = string.Join("; ", result.Errors.Select(e => e.Description));
            throw new InvalidOperationException($"Failed to disable user: {errors}");
        }

        _logger.LogInformation("User {UserId} disabled", userId);
    }

    public async Task<IReadOnlyCollection<string>> GetUserRolesAsync(Guid userId, CancellationToken ct = default)
    {
        var user = await _userRepository.GetByIdAsync(userId);
        if (user is null)
        {
            throw new KeyNotFoundException($"User {userId} not found");
        }

        return await _userManager.GetRolesAsync(user);
    }

    public async Task AddRolesAsync(Guid userId, AddRolesDto dto, CancellationToken ct = default)
    {
        ArgumentNullException.ThrowIfNull(dto);

        var user = await _userRepository.GetByIdAsync(userId);
        if (user is null)
        {
            throw new KeyNotFoundException($"User {userId} not found");
        }

        var distinct = dto.Roles
            .Select(r => r.Trim())
            .Where(r => r.Length > 0)
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToArray();

        if (distinct.Length == 0)
        {
            throw new ArgumentException("No roles provided");
        }

        foreach (var role in distinct)
        {
            if (!await _roleManager.RoleExistsAsync(role))
            {
                throw new ArgumentException($"Role '{role}' does not exist");
            }
        }

        var result = await _userManager.AddToRolesAsync(user, distinct);
        if (!result.Succeeded)
        {
            var errors = string.Join("; ", result.Errors.Select(e => e.Description));
            throw new InvalidOperationException($"Failed to add roles: {errors}");
        }

        _logger.LogInformation("Added roles {Roles} to user {UserId}", string.Join(",", distinct), userId);
    }

    public async Task RemoveRoleAsync(Guid userId, string role, CancellationToken ct = default)
    {
        ArgumentNullException.ThrowIfNull(role);

        var user = await _userRepository.GetByIdAsync(userId);
        if (user is null)
        {
            throw new KeyNotFoundException($"User {userId} not found");
        }

        if (!await _roleManager.RoleExistsAsync(role))
        {
            throw new ArgumentException($"Role '{role}' does not exist");
        }

        var result = await _userManager.RemoveFromRoleAsync(user, role);
        if (!result.Succeeded)
        {
            var errors = string.Join("; ", result.Errors.Select(e => e.Description));
            throw new InvalidOperationException($"Failed to remove role: {errors}");
        }

        _logger.LogInformation("Removed role {Role} from user {UserId}", role, userId);
    }

    public async Task<IReadOnlyCollection<string>> GetAllRolesAsync(CancellationToken ct = default)
    {
        return _roleManager.Roles.Select(r => r.Name!).OrderBy(n => n).ToList();
    }
}
