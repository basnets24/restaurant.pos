namespace IdentityService.Features.Identity.DTOs;

public record UsersQuery(
    string? Username,
    string? Role,
    int Page = 1,
    int PageSize = 25
);
