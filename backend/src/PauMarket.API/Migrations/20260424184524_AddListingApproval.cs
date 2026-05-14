using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PauMarket.API.Migrations
{
    /// <inheritdoc />
    public partial class AddListingApproval : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Listings_IsActive_Category",
                table: "Listings");

            migrationBuilder.AddColumn<bool>(
                name: "IsApproved",
                table: "Listings",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.CreateIndex(
                name: "IX_Listings_IsActive_IsApproved_Category",
                table: "Listings",
                columns: new[] { "IsActive", "IsApproved", "Category" });

            migrationBuilder.CreateIndex(
                name: "IX_Listings_SoldToUserId",
                table: "Listings",
                column: "SoldToUserId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Listings_IsActive_IsApproved_Category",
                table: "Listings");

            migrationBuilder.DropIndex(
                name: "IX_Listings_SoldToUserId",
                table: "Listings");

            migrationBuilder.DropColumn(
                name: "IsApproved",
                table: "Listings");

            migrationBuilder.CreateIndex(
                name: "IX_Listings_IsActive_Category",
                table: "Listings",
                columns: new[] { "IsActive", "Category" });
        }
    }
}
