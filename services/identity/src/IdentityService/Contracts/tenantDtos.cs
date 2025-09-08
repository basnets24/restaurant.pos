namespace IdentityService;

public record CreateLocationDto(
    string Name,
    string? TimeZoneId
);

public record UpdateLocationDto(
    string Name,
    bool IsActive,
    string? TimeZoneId
);

