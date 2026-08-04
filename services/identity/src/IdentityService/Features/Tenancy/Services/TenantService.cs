using IdentityService.Common.Extensions;
using IdentityService.Features.Tenancy.DTOs;
using IdentityService.Features.Tenancy.Repositories;
using Microsoft.EntityFrameworkCore;
using Tenant.Domain.Data;
using Tenant.Domain.Entities;

namespace IdentityService.Features.Tenancy.Services;

public class TenantService : ITenantService
{
    private readonly ITenantRepository _tenantRepository;
    private readonly ILocationRepository _locationRepository;
    private readonly TenantDbContext _tenantDb;
    private readonly ILogger<TenantService> _logger;

    public TenantService(
        ITenantRepository tenantRepository,
        ILocationRepository locationRepository,
        TenantDbContext tenantDb,
        ILogger<TenantService> logger)
    {
        _tenantRepository = tenantRepository ?? throw new ArgumentNullException(nameof(tenantRepository));
        _locationRepository = locationRepository ?? throw new ArgumentNullException(nameof(locationRepository));
        _tenantDb = tenantDb ?? throw new ArgumentNullException(nameof(tenantDb));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    public async Task<IReadOnlyList<TenantRestaurantDto>> GetMyTenantsAsync(
        Guid userId,
        CancellationToken ct = default)
    {
        var restaurants = await _tenantRepository.GetUserRestaurantsAsync(userId, ct);

        return restaurants
            .Select(r => new TenantRestaurantDto(r.Id, r.Name, r.Slug, r.IsActive, r.CreatedUtc))
            .ToList();
    }

    public async Task<TenantWithLocationsDto?> GetTenantAsync(
        string restaurantId,
        CancellationToken ct = default)
    {
        ArgumentNullException.ThrowIfNull(restaurantId);

        var restaurant = await _tenantRepository.GetByIdAsync(restaurantId);
        if (restaurant is null)
        {
            _logger.LogWarning("Restaurant {RestaurantId} not found", restaurantId);
            return null;
        }

        var locations = await _locationRepository.GetByRestaurantAsync(restaurantId, ct);

        var restaurantDto = new TenantRestaurantDto(
            restaurant.Id,
            restaurant.Name,
            restaurant.Slug,
            restaurant.IsActive,
            restaurant.CreatedUtc);

        var locationsDto = locations
            .Select(l => new TenantLocationDto(l.Id, l.RestaurantId, l.Name, l.IsActive, l.CreatedUtc, l.TimeZoneId))
            .ToList();

        return new TenantWithLocationsDto(restaurantDto, locationsDto);
    }

    public async Task<TenantLocationDto> CreateLocationAsync(
        Guid userId,
        string restaurantId,
        CreateLocationDto dto,
        CancellationToken ct = default)
    {
        ArgumentNullException.ThrowIfNull(dto);
        ArgumentNullException.ThrowIfNull(restaurantId);

        // Verify user is admin of restaurant
        if (!await _tenantDb.IsTenantAdminAsync(userId, restaurantId, ct))
        {
            throw new UnauthorizedAccessException($"User {userId} is not an admin of restaurant {restaurantId}");
        }

        // Verify restaurant exists
        var restaurant = await _tenantRepository.GetByIdAsync(restaurantId);
        if (restaurant is null)
        {
            throw new KeyNotFoundException($"Restaurant {restaurantId} not found");
        }

        // Check name is unique
        var sanitizedName = SanitizeInput(dto.Name.Trim());
        var isUnique = await _locationRepository.IsNameUniqueAsync(restaurantId, sanitizedName, null, ct);
        if (!isUnique)
        {
            throw new InvalidOperationException($"Location name '{sanitizedName}' already exists for this restaurant");
        }

        var location = new Location
        {
            RestaurantId = restaurantId,
            Name = sanitizedName,
            TimeZoneId = dto.TimeZoneId,
            IsActive = true
        };

        await _locationRepository.AddAsync(location);

        _logger.LogInformation(
            "Created location {LocationId} '{LocationName}' for restaurant {RestaurantId} by user {UserId}",
            location.Id, sanitizedName, restaurantId, userId);

        return new TenantLocationDto(
            location.Id,
            location.RestaurantId,
            location.Name,
            location.IsActive,
            location.CreatedUtc,
            location.TimeZoneId);
    }

    public async Task UpdateLocationAsync(
        Guid userId,
        string restaurantId,
        string locationId,
        UpdateLocationDto dto,
        CancellationToken ct = default)
    {
        ArgumentNullException.ThrowIfNull(dto);
        ArgumentNullException.ThrowIfNull(restaurantId);
        ArgumentNullException.ThrowIfNull(locationId);

        // Verify user is admin
        if (!await _tenantDb.IsTenantAdminAsync(userId, restaurantId, ct))
        {
            throw new UnauthorizedAccessException($"User {userId} is not an admin of restaurant {restaurantId}");
        }

        var location = await _locationRepository.GetByIdAsync(locationId);
        if (location is null || location.RestaurantId != restaurantId)
        {
            throw new KeyNotFoundException($"Location {locationId} not found for restaurant {restaurantId}");
        }

        var sanitizedName = SanitizeInput(dto.Name.Trim());

        // Check name uniqueness if changing
        if (location.Name != sanitizedName)
        {
            var isUnique = await _locationRepository.IsNameUniqueAsync(
                restaurantId,
                sanitizedName,
                locationId,
                ct);
            if (!isUnique)
            {
                throw new InvalidOperationException(
                    $"Another location with name '{sanitizedName}' already exists for this restaurant");
            }

            _logger.LogInformation(
                "Updating location {LocationId} name from '{OldName}' to '{NewName}' by user {UserId}",
                locationId, location.Name, sanitizedName, userId);

            location.Name = sanitizedName;
        }

        location.IsActive = dto.IsActive;
        location.TimeZoneId = dto.TimeZoneId;

        await _locationRepository.UpdateAsync(location);
    }

    public async Task UpdateRestaurantDiscoveryAsync(
        Guid userId,
        string restaurantId,
        UpdateRestaurantDiscoveryDto dto,
        CancellationToken ct = default)
    {
        ArgumentNullException.ThrowIfNull(dto);
        ArgumentNullException.ThrowIfNull(restaurantId);

        if (!await _tenantDb.IsTenantAdminAsync(userId, restaurantId, ct))
            throw new UnauthorizedAccessException($"User {userId} is not an admin of restaurant {restaurantId}");

        var restaurant = await _tenantRepository.GetByIdAsync(restaurantId)
            ?? throw new KeyNotFoundException($"Restaurant {restaurantId} not found");

        restaurant.Cuisine = string.IsNullOrWhiteSpace(dto.Cuisine)
            ? null
            : SanitizeInput(dto.Cuisine.Trim());

        await _tenantRepository.UpdateAsync(restaurant);

        _logger.LogInformation("Cuisine for restaurant {RestaurantId} set to '{Cuisine}' by user {UserId}",
            restaurantId, restaurant.Cuisine, userId);
    }

    public async Task UpdateLocationDiscoveryAsync(
        Guid userId,
        string restaurantId,
        string locationId,
        UpdateLocationDiscoveryDto dto,
        CancellationToken ct = default)
    {
        ArgumentNullException.ThrowIfNull(dto);
        ArgumentNullException.ThrowIfNull(restaurantId);
        ArgumentNullException.ThrowIfNull(locationId);

        if (!await _tenantDb.IsTenantAdminAsync(userId, restaurantId, ct))
            throw new UnauthorizedAccessException($"User {userId} is not an admin of restaurant {restaurantId}");

        var location = await _locationRepository.GetByIdAsync(locationId);
        if (location is null || location.RestaurantId != restaurantId)
            throw new KeyNotFoundException($"Location {locationId} not found for restaurant {restaurantId}");

        // An inactive location must never appear in public listings - discovery filters on
        // both flags, but rejecting here makes the contradiction visible to the caller
        // instead of silently accepting a setting that does nothing.
        if (dto.IsDiscoverable && !location.IsActive)
            throw new InvalidOperationException("An inactive location cannot be listed publicly.");

        location.IsDiscoverable = dto.IsDiscoverable;
        location.Address = string.IsNullOrWhiteSpace(dto.Address) ? null : SanitizeInput(dto.Address.Trim());
        location.DisplayDistanceMiles = dto.DisplayDistanceMiles;
        location.EstimatedPickupMinutes = dto.EstimatedPickupMinutes;

        await _locationRepository.UpdateAsync(location);

        _logger.LogInformation(
            "Location {LocationId} of restaurant {RestaurantId} discoverable={IsDiscoverable} by user {UserId}",
            locationId, restaurantId, dto.IsDiscoverable, userId);
    }

    private static string SanitizeInput(string input)
    {
        if (string.IsNullOrWhiteSpace(input))
            return input;

        var sanitized = input
            .Replace("<", "&lt;")
            .Replace(">", "&gt;")
            .Replace("\"", "&quot;")
            .Replace("'", "&#x27;")
            .Replace("&", "&amp;")
            .Replace("/", "&#x2F;");

        sanitized = System.Text.RegularExpressions.Regex.Replace(sanitized, @"\s+", " ");

        return sanitized.Trim();
    }
}
