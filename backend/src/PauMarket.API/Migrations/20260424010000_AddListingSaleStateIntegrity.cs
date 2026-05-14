using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using PauMarket.API.Data;

#nullable disable

namespace PauMarket.API.Migrations
{
    [DbContext(typeof(PauMarketDbContext))]
    [Migration("20260424010000_AddListingSaleStateIntegrity")]
    public partial class AddListingSaleStateIntegrity : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
                IF OBJECT_ID(N'[Listings]', N'U') IS NOT NULL
                BEGIN
                    UPDATE [Listings]
                    SET
                        [IsSold] = 0,
                        [SoldAt] = NULL,
                        [SoldToUserId] = NULL
                    WHERE [IsSold] = 0
                       OR [SoldToUserId] IS NULL
                       OR NOT EXISTS (
                            SELECT 1
                            FROM [Users]
                            WHERE [Users].[Id] = [Listings].[SoldToUserId]
                       );

                    UPDATE [Listings]
                    SET [SoldAt] = COALESCE([SoldAt], [CreatedAt], GETUTCDATE())
                    WHERE [IsSold] = 1
                      AND [SoldToUserId] IS NOT NULL
                      AND [SoldAt] IS NULL;

                    IF NOT EXISTS (
                        SELECT 1
                        FROM sys.foreign_keys
                        WHERE [name] = N'FK_Listings_Users_SoldToUserId'
                          AND [parent_object_id] = OBJECT_ID(N'[Listings]')
                    )
                    BEGIN
                        ALTER TABLE [Listings] WITH CHECK
                        ADD CONSTRAINT [FK_Listings_Users_SoldToUserId]
                        FOREIGN KEY([SoldToUserId]) REFERENCES [Users]([Id]);
                    END;

                    IF NOT EXISTS (
                        SELECT 1
                        FROM sys.check_constraints
                        WHERE [name] = N'CK_Listings_SaleState'
                          AND [parent_object_id] = OBJECT_ID(N'[Listings]')
                    )
                    BEGIN
                        ALTER TABLE [Listings] WITH CHECK
                        ADD CONSTRAINT [CK_Listings_SaleState]
                        CHECK (
                            ([IsSold] = 0 AND [SoldAt] IS NULL AND [SoldToUserId] IS NULL)
                            OR
                            ([IsSold] = 1 AND [SoldAt] IS NOT NULL AND [SoldToUserId] IS NOT NULL)
                        );
                    END;
                END
                """);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
                IF OBJECT_ID(N'[Listings]', N'U') IS NOT NULL
                BEGIN
                    IF EXISTS (
                        SELECT 1
                        FROM sys.check_constraints
                        WHERE [name] = N'CK_Listings_SaleState'
                          AND [parent_object_id] = OBJECT_ID(N'[Listings]')
                    )
                    BEGIN
                        ALTER TABLE [Listings] DROP CONSTRAINT [CK_Listings_SaleState];
                    END;

                    IF EXISTS (
                        SELECT 1
                        FROM sys.foreign_keys
                        WHERE [name] = N'FK_Listings_Users_SoldToUserId'
                          AND [parent_object_id] = OBJECT_ID(N'[Listings]')
                    )
                    BEGIN
                        ALTER TABLE [Listings] DROP CONSTRAINT [FK_Listings_Users_SoldToUserId];
                    END;
                END
                """);
        }
    }
}
