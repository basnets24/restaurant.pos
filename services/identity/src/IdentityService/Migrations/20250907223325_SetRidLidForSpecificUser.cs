using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace IdentityService.Migrations
{
    /// <inheritdoc />
    public partial class SetRidLidForSpecificUser : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
                UPDATE ""AspNetUsers""
                SET ""CurrentRestaurantId"" = 'd14b89699cbd4c1d9dffb30f6809b9d4',
                    ""CurrentLocationId""   = 'd78c6d1851ff4ed3a05a98e58ba87e63'
                WHERE ""Id"" = '9e12066f-9a4c-4ac9-a04a-da876e260983'::uuid;
            ");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
                UPDATE ""AspNetUsers""
                SET ""CurrentRestaurantId"" = NULL,
                    ""CurrentLocationId""   = NULL
                WHERE ""Id"" = '9e12066f-9a4c-4ac9-a04a-da876e260983'::uuid;
            ");
        }
    }
}
