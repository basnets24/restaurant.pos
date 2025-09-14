using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace IdentityService.Migrations.Tenant
{
    /// <inheritdoc />
    public partial class ChangeTenantUserIdToUuid : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Normalize any accidental whitespace
            migrationBuilder.Sql("UPDATE tenant.\"RestaurantMemberships\" SET \"UserId\" = btrim(\"UserId\") WHERE \"UserId\" IS NOT NULL;");
            migrationBuilder.Sql("UPDATE tenant.\"RestaurantUserRoles\" SET \"UserId\" = btrim(\"UserId\") WHERE \"UserId\" IS NOT NULL;");

            // Remove rows with invalid UUID format in text UserId
            const string uuidRegex = "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$";
            migrationBuilder.Sql($"DELETE FROM tenant.\"RestaurantUserRoles\" r WHERE r.\"UserId\" IS NULL OR r.\"UserId\" = '' OR r.\"UserId\" !~* '{uuidRegex}';");
            migrationBuilder.Sql($"DELETE FROM tenant.\"RestaurantMemberships\" m WHERE m.\"UserId\" IS NULL OR m.\"UserId\" = '' OR m.\"UserId\" !~* '{uuidRegex}';");

            // Remove rows where UUID is valid but does not exist in AspNetUsers
            migrationBuilder.Sql($@"
                DELETE FROM tenant.""RestaurantUserRoles"" r
                WHERE r.""UserId"" ~* '{uuidRegex}'
                  AND NOT EXISTS (
                        SELECT 1 FROM public.""AspNetUsers"" u
                        WHERE u.""Id"" = r.""UserId""::uuid
                  );
            ");

            migrationBuilder.Sql($@"
                DELETE FROM tenant.""RestaurantMemberships"" m
                WHERE m.""UserId"" ~* '{uuidRegex}'
                  AND NOT EXISTS (
                        SELECT 1 FROM public.""AspNetUsers"" u
                        WHERE u.""Id"" = m.""UserId""::uuid
                  );
            ");

            // Drop dependent indexes before altering column types
            migrationBuilder.DropIndex(
                name: "IX_RestaurantMemberships_UserId_RestaurantId",
                schema: "tenant",
                table: "RestaurantMemberships");

            migrationBuilder.DropIndex(
                name: "IX_RestaurantUserRoles_UserId_RestaurantId_RoleName",
                schema: "tenant",
                table: "RestaurantUserRoles");

            // Alter UserId columns from text -> uuid
            migrationBuilder.AlterColumn<Guid>(
                name: "UserId",
                schema: "tenant",
                table: "RestaurantMemberships",
                type: "uuid",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "text");

            migrationBuilder.AlterColumn<Guid>(
                name: "UserId",
                schema: "tenant",
                table: "RestaurantUserRoles",
                type: "uuid",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "text");

            // Recreate unique indexes
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
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Drop indexes before reverting column types
            migrationBuilder.DropIndex(
                name: "IX_RestaurantMemberships_UserId_RestaurantId",
                schema: "tenant",
                table: "RestaurantMemberships");

            migrationBuilder.DropIndex(
                name: "IX_RestaurantUserRoles_UserId_RestaurantId_RoleName",
                schema: "tenant",
                table: "RestaurantUserRoles");

            // Revert uuid -> text
            migrationBuilder.AlterColumn<string>(
                name: "UserId",
                schema: "tenant",
                table: "RestaurantMemberships",
                type: "text",
                nullable: false,
                oldClrType: typeof(Guid),
                oldType: "uuid");

            migrationBuilder.AlterColumn<string>(
                name: "UserId",
                schema: "tenant",
                table: "RestaurantUserRoles",
                type: "text",
                nullable: false,
                oldClrType: typeof(Guid),
                oldType: "uuid");

            // Recreate original unique indexes
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
        }
    }
}
