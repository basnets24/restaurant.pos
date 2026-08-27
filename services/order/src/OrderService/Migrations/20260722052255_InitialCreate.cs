using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace OrderService.Migrations
{
    /// <inheritdoc />
    public partial class InitialCreate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.EnsureSchema(
                name: "order");

            migrationBuilder.CreateTable(
                name: "Carts",
                schema: "order",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    RestaurantId = table.Column<string>(type: "text", nullable: false),
                    LocationId = table.Column<string>(type: "text", nullable: false),
                    TableId = table.Column<Guid>(type: "uuid", nullable: true),
                    CustomerId = table.Column<Guid>(type: "uuid", nullable: true),
                    ServerId = table.Column<Guid>(type: "uuid", nullable: true),
                    ServerName = table.Column<string>(type: "text", nullable: true),
                    GuestCount = table.Column<int>(type: "integer", nullable: true),
                    Items = table.Column<string>(type: "jsonb", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Carts", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "DiningTables",
                schema: "order",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    RestaurantId = table.Column<string>(type: "text", nullable: false),
                    LocationId = table.Column<string>(type: "text", nullable: false),
                    Number = table.Column<string>(type: "text", nullable: false),
                    Section = table.Column<string>(type: "text", nullable: false),
                    Seats = table.Column<int>(type: "integer", nullable: false),
                    ActiveCartId = table.Column<Guid>(type: "uuid", nullable: true),
                    ServerId = table.Column<Guid>(type: "uuid", nullable: true),
                    Shape = table.Column<string>(type: "text", nullable: false),
                    X = table.Column<double>(type: "double precision", nullable: false),
                    Y = table.Column<double>(type: "double precision", nullable: false),
                    Width = table.Column<double>(type: "double precision", nullable: false),
                    Height = table.Column<double>(type: "double precision", nullable: false),
                    Rotation = table.Column<double>(type: "double precision", nullable: false),
                    Status = table.Column<string>(type: "text", nullable: false),
                    PartySize = table.Column<int>(type: "integer", nullable: true),
                    GroupId = table.Column<string>(type: "text", nullable: true),
                    GroupLabel = table.Column<string>(type: "text", nullable: true),
                    Version = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DiningTables", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Orders",
                schema: "order",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    RestaurantId = table.Column<string>(type: "text", nullable: false),
                    LocationId = table.Column<string>(type: "text", nullable: false),
                    TableId = table.Column<Guid>(type: "uuid", nullable: true),
                    ServerId = table.Column<Guid>(type: "uuid", nullable: true),
                    ServerName = table.Column<string>(type: "text", nullable: true),
                    CustomerId = table.Column<Guid>(type: "uuid", nullable: true),
                    GuestCount = table.Column<int>(type: "integer", nullable: true),
                    Items = table.Column<string>(type: "jsonb", nullable: false),
                    Status = table.Column<string>(type: "text", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    AppliedDiscounts = table.Column<string>(type: "jsonb", nullable: false),
                    AppliedTaxes = table.Column<string>(type: "jsonb", nullable: false),
                    ServiceCharges = table.Column<string>(type: "jsonb", nullable: false),
                    TipAmount = table.Column<decimal>(type: "numeric", nullable: true),
                    Subtotal = table.Column<decimal>(type: "numeric", nullable: false),
                    DiscountTotal = table.Column<decimal>(type: "numeric", nullable: false),
                    ServiceChargeTotal = table.Column<decimal>(type: "numeric", nullable: false),
                    TaxTotal = table.Column<decimal>(type: "numeric", nullable: false),
                    GrandTotal = table.Column<decimal>(type: "numeric", nullable: false),
                    ReceiptUrl = table.Column<string>(type: "text", nullable: true),
                    PaidAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    LastPaymentError = table.Column<string>(type: "text", nullable: true),
                    LastPaymentFailedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Orders", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "PosCatalogItems",
                schema: "order",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    RestaurantId = table.Column<string>(type: "text", nullable: false),
                    LocationId = table.Column<string>(type: "text", nullable: false),
                    Name = table.Column<string>(type: "text", nullable: false),
                    Category = table.Column<string>(type: "text", nullable: false),
                    BasePrice = table.Column<decimal>(type: "numeric", nullable: false),
                    Quantity = table.Column<int>(type: "integer", nullable: false),
                    MenuAvailable = table.Column<bool>(type: "boolean", nullable: false),
                    InventoryAvailable = table.Column<bool>(type: "boolean", nullable: false),
                    IsAvailable = table.Column<bool>(type: "boolean", nullable: false),
                    MenuVersion = table.Column<long>(type: "bigint", nullable: false),
                    InventoryVersion = table.Column<long>(type: "bigint", nullable: false),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PosCatalogItems", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Carts_RestaurantId_LocationId",
                schema: "order",
                table: "Carts",
                columns: new[] { "RestaurantId", "LocationId" });

            migrationBuilder.CreateIndex(
                name: "IX_DiningTables_RestaurantId_LocationId",
                schema: "order",
                table: "DiningTables",
                columns: new[] { "RestaurantId", "LocationId" });

            migrationBuilder.CreateIndex(
                name: "IX_Orders_RestaurantId_LocationId",
                schema: "order",
                table: "Orders",
                columns: new[] { "RestaurantId", "LocationId" });

            migrationBuilder.CreateIndex(
                name: "IX_PosCatalogItems_RestaurantId_LocationId",
                schema: "order",
                table: "PosCatalogItems",
                columns: new[] { "RestaurantId", "LocationId" });

            migrationBuilder.CreateIndex(
                name: "IX_PosCatalogItems_RestaurantId_LocationId_Category_Name",
                schema: "order",
                table: "PosCatalogItems",
                columns: new[] { "RestaurantId", "LocationId", "Category", "Name" });

            migrationBuilder.CreateIndex(
                name: "IX_PosCatalogItems_RestaurantId_LocationId_IsAvailable",
                schema: "order",
                table: "PosCatalogItems",
                columns: new[] { "RestaurantId", "LocationId", "IsAvailable" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "Carts",
                schema: "order");

            migrationBuilder.DropTable(
                name: "DiningTables",
                schema: "order");

            migrationBuilder.DropTable(
                name: "Orders",
                schema: "order");

            migrationBuilder.DropTable(
                name: "PosCatalogItems",
                schema: "order");
        }
    }
}
