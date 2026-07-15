namespace IdentityService.Features.Shared.DTOs;

public record Paged<T>(
    IReadOnlyList<T> Items,
    int Page,
    int PageSize,
    long Total
);
