using IdentityService.Features.Shared.DTOs;
using IdentityService.Features.Tenancy.DTOs;

namespace IdentityService.Features.Tenancy.Services;

/// <summary>
/// Service for managing restaurant employees.
/// Handles employee listing, role management, and updates.
/// </summary>
public interface IEmployeeService
{
    /// <summary>List employees in a restaurant with pagination and optional filtering.</summary>
    Task<Paged<EmployeeListItemDto>> ListEmployeesAsync(
        Guid userId,
        string restaurantId,
        string? searchQuery,
        string? role,
        int page,
        int pageSize,
        CancellationToken ct = default);

    /// <summary>Get employee details for a specific restaurant.</summary>
    Task<EmployeeDetailDto?> GetEmployeeAsync(
        Guid userId,
        string restaurantId,
        Guid employeeId,
        CancellationToken ct = default);

    /// <summary>Update employee information.</summary>
    Task UpdateEmployeeAsync(
        Guid userId,
        string restaurantId,
        Guid employeeId,
        UserUpdateDto dto,
        CancellationToken ct = default);

    /// <summary>Get roles assigned to an employee.</summary>
    Task<IReadOnlyCollection<string>> GetEmployeeRolesAsync(
        Guid userId,
        string restaurantId,
        Guid employeeId,
        CancellationToken ct = default);

    /// <summary>Add roles to an employee.</summary>
    Task AddEmployeeRolesAsync(
        Guid userId,
        string restaurantId,
        Guid employeeId,
        EmployeeRoleUpdateDto dto,
        CancellationToken ct = default);

    /// <summary>Remove a role from an employee.</summary>
    Task RemoveEmployeeRoleAsync(
        Guid userId,
        string restaurantId,
        Guid employeeId,
        string role,
        CancellationToken ct = default);

    /// <summary>Add an employee to a restaurant.</summary>
    Task AddEmployeeAsync(
        Guid userId,
        string restaurantId,
        AddEmployeeDto dto,
        CancellationToken ct = default);

    /// <summary>Update employee's default location.</summary>
    Task UpdateEmployeeDefaultLocationAsync(
        Guid userId,
        string restaurantId,
        Guid employeeId,
        DefaultLocationUpdateDto dto,
        CancellationToken ct = default);

    /// <summary>Get available role names for restaurant employees.</summary>
    Task<IReadOnlyCollection<string>> GetAvailableRolesAsync(CancellationToken ct = default);
}
