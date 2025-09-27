using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Tenant.Domain.Migrations
{
    /// <inheritdoc />
    public partial class AddPerformanceIndexes : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Only add performance indexes - tables already exist from previous migrations
            
            // Performance indexes for query optimization
            migrationBuilder.CreateIndex(
                name: "IX_RestaurantMemberships_UserId",
                schema: "tenant",
                table: "RestaurantMemberships",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_RestaurantUserRoles_UserId_RestaurantId",
                schema: "tenant",
                table: "RestaurantUserRoles",
                columns: new[] { "UserId", "RestaurantId" });

            migrationBuilder.CreateIndex(
                name: "IX_TenantLocations_RestaurantId_IsActive",
                schema: "tenant",
                table: "TenantLocations",
                columns: new[] { "RestaurantId", "IsActive" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Drop only the performance indexes added in this migration
            migrationBuilder.DropIndex(
                name: "IX_RestaurantMemberships_UserId",
                schema: "tenant",
                table: "RestaurantMemberships");

            migrationBuilder.DropIndex(
                name: "IX_RestaurantUserRoles_UserId_RestaurantId",
                schema: "tenant",
                table: "RestaurantUserRoles");

            migrationBuilder.DropIndex(
                name: "IX_TenantLocations_RestaurantId_IsActive",
                schema: "tenant",
                table: "TenantLocations");
        }
    }
}
