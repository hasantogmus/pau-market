using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PauMarket.API.Migrations
{
    /// <inheritdoc />
    public partial class AddDealRequestsAndSaleFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
                IF COL_LENGTH('Listings', 'IsSold') IS NULL
                    ALTER TABLE [Listings] ADD [IsSold] bit NOT NULL CONSTRAINT [DF_Listings_IsSold] DEFAULT(0);

                IF COL_LENGTH('Listings', 'SoldAt') IS NULL
                    ALTER TABLE [Listings] ADD [SoldAt] datetime2 NULL;

                IF COL_LENGTH('Listings', 'SoldToUserId') IS NULL
                    ALTER TABLE [Listings] ADD [SoldToUserId] int NULL;

                IF OBJECT_ID(N'[DealRequests]', N'U') IS NULL
                BEGIN
                    CREATE TABLE [DealRequests]
                    (
                        [Id] int IDENTITY(1,1) NOT NULL,
                        [ListingId] int NOT NULL,
                        [BuyerId] int NOT NULL,
                        [SellerId] int NOT NULL,
                        [Note] nvarchar(500) NULL,
                        [Status] int NOT NULL CONSTRAINT [DF_DealRequests_Status] DEFAULT(1),
                        [RequestedAt] datetime2 NOT NULL CONSTRAINT [DF_DealRequests_RequestedAt] DEFAULT(GETUTCDATE()),
                        [RespondedAt] datetime2 NULL,
                        CONSTRAINT [PK_DealRequests] PRIMARY KEY ([Id])
                    );
                END;

                IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_DealRequests_Listings_ListingId')
                    ALTER TABLE [DealRequests] WITH CHECK ADD CONSTRAINT [FK_DealRequests_Listings_ListingId]
                    FOREIGN KEY([ListingId]) REFERENCES [Listings]([Id]) ON DELETE CASCADE;

                IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_DealRequests_Users_BuyerId')
                    ALTER TABLE [DealRequests] WITH CHECK ADD CONSTRAINT [FK_DealRequests_Users_BuyerId]
                    FOREIGN KEY([BuyerId]) REFERENCES [Users]([Id]);

                IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_DealRequests_Users_SellerId')
                    ALTER TABLE [DealRequests] WITH CHECK ADD CONSTRAINT [FK_DealRequests_Users_SellerId]
                    FOREIGN KEY([SellerId]) REFERENCES [Users]([Id]);

                IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_DealRequests_BuyerId' AND object_id = OBJECT_ID(N'[DealRequests]'))
                    CREATE INDEX [IX_DealRequests_BuyerId] ON [DealRequests]([BuyerId]);

                IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'UX_DealRequests_Listing_Buyer' AND object_id = OBJECT_ID(N'[DealRequests]'))
                    CREATE UNIQUE INDEX [UX_DealRequests_Listing_Buyer] ON [DealRequests]([ListingId], [BuyerId]);

                IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_DealRequests_Seller_Status' AND object_id = OBJECT_ID(N'[DealRequests]'))
                    CREATE INDEX [IX_DealRequests_Seller_Status] ON [DealRequests]([SellerId], [Status]);
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
                IF OBJECT_ID(N'[DealRequests]', N'U') IS NOT NULL
                BEGIN
                    IF EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_DealRequests_Listings_ListingId')
                        ALTER TABLE [DealRequests] DROP CONSTRAINT [FK_DealRequests_Listings_ListingId];

                    IF EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_DealRequests_Users_BuyerId')
                        ALTER TABLE [DealRequests] DROP CONSTRAINT [FK_DealRequests_Users_BuyerId];

                    IF EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_DealRequests_Users_SellerId')
                        ALTER TABLE [DealRequests] DROP CONSTRAINT [FK_DealRequests_Users_SellerId];

                    DROP TABLE [DealRequests];
                END;

                IF COL_LENGTH('Listings', 'SoldToUserId') IS NOT NULL
                    ALTER TABLE [Listings] DROP COLUMN [SoldToUserId];

                IF COL_LENGTH('Listings', 'SoldAt') IS NOT NULL
                    ALTER TABLE [Listings] DROP COLUMN [SoldAt];

                IF COL_LENGTH('Listings', 'IsSold') IS NOT NULL
                BEGIN
                    IF EXISTS (SELECT 1 FROM sys.default_constraints WHERE name = N'DF_Listings_IsSold')
                        ALTER TABLE [Listings] DROP CONSTRAINT [DF_Listings_IsSold];

                    ALTER TABLE [Listings] DROP COLUMN [IsSold];
                END;
                """);
        }
    }
}
