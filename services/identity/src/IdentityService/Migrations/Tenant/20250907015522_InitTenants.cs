using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace IdentityService.Migrations.Tenant
{
    /// <inheritdoc />
    public partial class InitTenants : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.EnsureSchema(
                name: "tenant");

            migrationBuilder.CreateTable(
                name: "RestaurantMemberships",
                schema: "tenant",
                columns: table => new
                {
                    Id = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    UserId = table.Column<string>(type: "text", nullable: false),
                    RestaurantId = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    DefaultLocationId = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: true),
                    CreatedUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RestaurantMemberships", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "RestaurantUserRoles",
                schema: "tenant",
                columns: table => new
                {
                    Id = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    UserId = table.Column<string>(type: "text", nullable: false),
                    RestaurantId = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    RoleName = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RestaurantUserRoles", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Tenants",
                schema: "tenant",
                columns: table => new
                {
                    Id = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    Name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Slug = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: true),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Tenants", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "TenantLocations",
                schema: "tenant",
                columns: table => new
                {
                    Id = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    RestaurantId = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    Name = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: false),
                    TimeZoneId = table.Column<string>(type: "text", nullable: true),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TenantLocations", x => x.Id);
                    table.ForeignKey(
                        name: "FK_TenantLocations_Tenants_RestaurantId",
                        column: x => x.RestaurantId,
                        principalSchema: "tenant",
                        principalTable: "Tenants",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_RestaurantMemberships_UserId_RestaurantId",
                schema: "tenant",
                table: "RestaurantMemberships",
                columns: new[] { "UserId", "RestaurantId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_RestaurantUserRoles_UserId_RestaurantId_RoleName",
                schema: "tenant",
                table: "RestaurantUserRoles",
                columns: new[] { "UserId", "RestaurantId", "RoleName" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_TenantLocations_RestaurantId_Name",
                schema: "tenant",
                table: "TenantLocations",
                columns: new[] { "RestaurantId", "Name" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "RestaurantMemberships",
                schema: "tenant");

            migrationBuilder.DropTable(
                name: "RestaurantUserRoles",
                schema: "tenant");

            migrationBuilder.DropTable(
                name: "TenantLocations",
                schema: "tenant");

            migrationBuilder.DropTable(
                name: "Tenants",
                schema: "tenant");
        }
    }
}
