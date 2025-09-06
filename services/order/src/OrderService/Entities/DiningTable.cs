using Common.Library;
using Common.Library.Tenancy;

namespace OrderService.Entities;

public class DiningTable : IEntity, ITenantEntity
{
    public Guid Id { get; set; }
    public string RestaurantId { get; set; } = default!;
    public string LocationId { get; set; } = default!;
    
    public string Number { get; set; } = default!; // e.g., "7"
    public string Section { get; set; } = ""; // e.g., "Center"
    public int Seats { get; set; }

    public Guid? ActiveCartId { get; set; }
    public Guid? ServerId { get; set; }
    public string Shape { get; set; } = "square"; // round|square|rectangle|booth
    public double X { get; set; }
    public double Y { get; set; }
    public double Width { get; set; }
    public double Height { get; set; }
    public double Rotation { get; set; } // optional for future rotation


    public string Status { get; set; } = "available"; // available|occupied|reserved|dirty
    public int? PartySize { get; set; }
    
    public string? GroupId { get; set; } // for join/split
    public string? GroupLabel { get; set; }


    public int Version { get; set; }
}

public static class DiningTableStatus
{
    public static readonly HashSet<string> Allowed = new(StringComparer.OrdinalIgnoreCase)
    {
        "available", "occupied", "reserved", "dirty"
    };
    public static bool IsValid(string status) => Allowed.Contains(status);
}