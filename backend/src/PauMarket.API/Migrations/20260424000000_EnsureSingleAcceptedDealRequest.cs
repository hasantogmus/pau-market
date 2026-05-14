using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using PauMarket.API.Data;

#nullable disable

namespace PauMarket.API.Migrations
{
    [DbContext(typeof(PauMarketDbContext))]
    [Migration("20260424000000_EnsureSingleAcceptedDealRequest")]
    public partial class EnsureSingleAcceptedDealRequest : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
                IF OBJECT_ID(N'[DealRequests]', N'U') IS NOT NULL
                BEGIN
                    ;WITH RankedAccepted AS
                    (
                        SELECT
                            [Id],
                            ROW_NUMBER() OVER (
                                PARTITION BY [ListingId]
                                ORDER BY COALESCE([RespondedAt], [RequestedAt]) DESC, [Id] DESC
                            ) AS [rn]
                        FROM [DealRequests]
                        WHERE [Status] = 2
                    )
                    UPDATE [DealRequests]
                    SET
                        [Status] = 3,
                        [RespondedAt] = COALESCE([RespondedAt], GETUTCDATE())
                    WHERE [Id] IN (
                        SELECT [Id]
                        FROM RankedAccepted
                        WHERE [rn] > 1
                    );

                    IF NOT EXISTS (
                        SELECT 1
                        FROM sys.indexes
                        WHERE [name] = N'UX_DealRequests_Listing_Accepted'
                          AND [object_id] = OBJECT_ID(N'[DealRequests]')
                    )
                    BEGIN
                        CREATE UNIQUE INDEX [UX_DealRequests_Listing_Accepted]
                            ON [DealRequests] ([ListingId])
                            WHERE [Status] = 2;
                    END
                END
                """);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
                IF OBJECT_ID(N'[DealRequests]', N'U') IS NOT NULL
                BEGIN
                    IF EXISTS (
                        SELECT 1
                        FROM sys.indexes
                        WHERE [name] = N'UX_DealRequests_Listing_Accepted'
                          AND [object_id] = OBJECT_ID(N'[DealRequests]')
                    )
                    BEGIN
                        DROP INDEX [UX_DealRequests_Listing_Accepted] ON [DealRequests];
                    END
                END
                """);
        }
    }
}
