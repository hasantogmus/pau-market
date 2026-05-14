using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using PauMarket.API.Data;

#nullable disable

namespace PauMarket.API.Migrations
{
    [DbContext(typeof(PauMarketDbContext))]
    [Migration("20260425000000_AddListingModerationState")]
    public partial class AddListingModerationState : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "ModerationStatus",
                table: "Listings",
                type: "int",
                nullable: false,
                defaultValue: 1);

            migrationBuilder.AddColumn<string>(
                name: "ModerationReason",
                table: "Listings",
                type: "nvarchar(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.Sql("""
                UPDATE [Listings]
                SET [ModerationStatus] = CASE
                    WHEN [IsApproved] = 1 THEN 2
                    WHEN [IsApproved] = 0 AND [IsActive] = 0 THEN 3
                    ELSE 1
                END,
                [ModerationReason] = CASE
                    WHEN [IsApproved] = 0 AND [IsActive] = 0 THEN N'İlan daha önce moderasyon tarafından yayından kaldırıldı.'
                    ELSE [ModerationReason]
                END;
                """);

            migrationBuilder.AddCheckConstraint(
                name: "CK_Listings_ModerationState",
                table: "Listings",
                sql: "[ModerationStatus] IN (1, 2, 3) AND (([IsApproved] = 1 AND [ModerationStatus] = 2) OR ([IsApproved] = 0 AND [ModerationStatus] <> 2))");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropCheckConstraint(
                name: "CK_Listings_ModerationState",
                table: "Listings");

            migrationBuilder.DropColumn(
                name: "ModerationReason",
                table: "Listings");

            migrationBuilder.DropColumn(
                name: "ModerationStatus",
                table: "Listings");
        }
    }
}
