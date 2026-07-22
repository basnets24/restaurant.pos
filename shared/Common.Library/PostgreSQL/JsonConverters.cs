using System.Text.Json;
using Microsoft.EntityFrameworkCore.ChangeTracking;
using Microsoft.EntityFrameworkCore.Storage.ValueConversion;

namespace Common.Library.PostgreSQL;

/// <summary>
/// EF Core value converter/comparer pair for mapping List{T} properties to a
/// jsonb column via plain System.Text.Json, instead of EF's owned-entity-type
/// machinery. Suitable for simple classes/records with only primitive or
/// nullable-primitive members - remember to also call .HasColumnType("jsonb")
/// on the property, since EF defaults a converted-to-string column to text.
/// </summary>
public static class JsonConverters
{
    public static ValueConverter<List<T>, string> ListConverter<T>() => new(
        v => JsonSerializer.Serialize(v, (JsonSerializerOptions?)null),
        v => JsonSerializer.Deserialize<List<T>>(v, (JsonSerializerOptions?)null) ?? new List<T>());

    public static ValueComparer<List<T>> ListComparer<T>() => new(
        (a, b) => JsonSerializer.Serialize(a, (JsonSerializerOptions?)null) == JsonSerializer.Serialize(b, (JsonSerializerOptions?)null),
        v => v == null ? 0 : JsonSerializer.Serialize(v, (JsonSerializerOptions?)null).GetHashCode(),
        v => JsonSerializer.Deserialize<List<T>>(JsonSerializer.Serialize(v, (JsonSerializerOptions?)null), (JsonSerializerOptions?)null)!);
}
