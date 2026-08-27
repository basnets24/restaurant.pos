using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace OrderService.Migrations
{
    /// <inheritdoc />
    public partial class AddDinerOrderFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "OrderType",
                schema: "order",
                table: "Orders",
                type: "text",
                nullable: false,
                defaultValue: "DineIn");

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "PickupTime",
                schema: "order",
                table: "Orders",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "OrderType",
                schema: "order",
                table: "Carts",
                type: "text",
                nullable: false,
                defaultValue: "DineIn");

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "PickupTime",
                schema: "order",
                table: "Carts",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Orders_RestaurantId_LocationId_CustomerId",
                schema: "order",
                table: "Orders",
                columns: new[] { "RestaurantId", "LocationId", "CustomerId" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Orders_RestaurantId_LocationId_CustomerId",
                schema: "order",
                table: "Orders");

            migrationBuilder.DropColumn(
                name: "OrderType",
                schema: "order",
                table: "Orders");

            migrationBuilder.DropColumn(
                name: "PickupTime",
                schema: "order",
                table: "Orders");

            migrationBuilder.DropColumn(
                name: "OrderType",
                schema: "order",
                table: "Carts");

            migrationBuilder.DropColumn(
                name: "PickupTime",
                schema: "order",
                table: "Carts");
        }
    }
}
