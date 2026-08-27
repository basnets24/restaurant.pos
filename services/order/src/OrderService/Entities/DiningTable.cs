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

/// <summary>
/// Single source of truth for table status values and their canonical (PascalCase)
/// storage form - shared by CartService and DiningTableService, which previously
/// each hardcoded their own casing convention for the same concept.
/// </summary>
public static class DiningTableStatus
{
    public const string Available = "Available";
    public const string Occupied = "Occupied";
    public const string Reserved = "Reserved";
    public const string Dirty = "Dirty";

    /// <summary>Case-insensitively maps a status string to its canonical storage form. Throws on anything else.</summary>
    public static string Normalize(string? status) =>
        (status ?? string.Empty).Trim().ToLowerInvariant() switch
        {
            "available" => Available,
            "reserved" => Reserved,
            "occupied" => Occupied,
            "dirty" => Dirty,
            _ => throw new ArgumentException("Invalid status. Use: available|reserved|occupied|dirty.")
        };
}