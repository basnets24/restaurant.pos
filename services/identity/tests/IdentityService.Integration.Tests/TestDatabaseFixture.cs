using IdentityService.Data;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace IdentityService.Integration.Tests;

/// <summary>
/// Fixture for managing test database state in integration tests.
/// Provides a fresh database for each test and cleanup.
/// </summary>
public class TestDatabaseFixture : IAsyncLifetime
{
    private readonly string _connectionString =
        "Host=localhost;Port=5432;Database=identity_service_test;Username=postgres;Password=postgres";

    public ApplicationDbContext DbContext { get; private set; } = null!;

    public async Task InitializeAsync()
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseNpgsql(_connectionString)
            .Options;

        DbContext = new ApplicationDbContext(options);

        // Create or reset database
        await DbContext.Database.EnsureDeletedAsync();
        await DbContext.Database.EnsureCreatedAsync();
    }

    public async Task DisposeAsync()
    {
        if (DbContext != null)
        {
            await DbContext.Database.EnsureDeletedAsync();
            await DbContext.DisposeAsync();
        }
    }

    /// <summary>
    /// Reset database to clean state without recreating
    /// </summary>
    public async Task ResetDatabaseAsync()
    {
        var connection = DbContext.Database.GetDbConnection();

        try
        {
            await connection.OpenAsync();
            using var command = connection.CreateCommand();

            // Clear all tables
            command.CommandText = @"
                TRUNCATE TABLE ""AspNetUserRoles"" CASCADE;
                TRUNCATE TABLE ""AspNetUserClaims"" CASCADE;
                TRUNCATE TABLE ""AspNetUserLogins"" CASCADE;
                TRUNCATE TABLE ""AspNetUserTokens"" CASCADE;
                TRUNCATE TABLE ""AspNetUsers"" CASCADE;
                TRUNCATE TABLE ""AspNetRoles"" CASCADE;
                TRUNCATE TABLE ""RestaurantUserRoles"" CASCADE;
                TRUNCATE TABLE ""RestaurantMemberships"" CASCADE;
                TRUNCATE TABLE ""Locations"" CASCADE;
                TRUNCATE TABLE ""Restaurants"" CASCADE;
            ";

            await command.ExecuteNonQueryAsync();
        }
        finally
        {
            await connection.CloseAsync();
        }
    }
}
