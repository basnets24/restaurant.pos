using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Tenant.Domain.Migrations
{
    /// <inheritdoc />
    public partial class AddDiscoveryFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Cuisine",
                schema: "tenant",
                table: "Tenants",
                type: "character varying(64)",
                maxLength: 64,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Address",
                schema: "tenant",
                table: "TenantLocations",
                type: "character varying(250)",
                maxLength: 250,
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "DisplayDistanceMiles",
                schema: "tenant",
                table: "TenantLocations",
                type: "numeric(5,2)",
                precision: 5,
                scale: 2,
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "EstimatedPickupMinutes",
                schema: "tenant",
                table: "TenantLocations",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "IsDiscoverable",
                schema: "tenant",
                table: "TenantLocations",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.CreateIndex(
                name: "IX_TenantLocations_IsDiscoverable_IsActive",
                schema: "tenant",
                table: "TenantLocations",
                columns: new[] { "IsDiscoverable", "IsActive" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_TenantLocations_IsDiscoverable_IsActive",
                schema: "tenant",
                table: "TenantLocations");

            migrationBuilder.DropColumn(
                name: "Cuisine",
                schema: "tenant",
                table: "Tenants");

            migrationBuilder.DropColumn(
                name: "Address",
                schema: "tenant",
                table: "TenantLocations");

            migrationBuilder.DropColumn(
                name: "DisplayDistanceMiles",
                schema: "tenant",
                table: "TenantLocations");

            migrationBuilder.DropColumn(
                name: "EstimatedPickupMinutes",
                schema: "tenant",
                table: "TenantLocations");

            migrationBuilder.DropColumn(
                name: "IsDiscoverable",
                schema: "tenant",
                table: "TenantLocations");
        }
    }
}
