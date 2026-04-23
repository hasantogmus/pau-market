using Microsoft.EntityFrameworkCore.Migrations;
using Microsoft.EntityFrameworkCore.Infrastructure;
using PauMarket.API.Data;

#nullable disable

namespace PauMarket.API.Migrations
{
    [DbContext(typeof(PauMarketDbContext))]
    [Migration("20260422000000_AddListingImages")]
    public partial class AddListingImages : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
                IF OBJECT_ID(N'[ListingImages]', N'U') IS NULL
                BEGIN
                    CREATE TABLE [ListingImages] (
                        [Id] int NOT NULL IDENTITY,
                        [ListingId] int NOT NULL,
                        [ImageUrl] nvarchar(max) NOT NULL,
                        [SortOrder] int NOT NULL,
                        [CreatedAt] datetime2 NOT NULL CONSTRAINT [DF_ListingImages_CreatedAt] DEFAULT (GETUTCDATE()),
                        CONSTRAINT [PK_ListingImages] PRIMARY KEY ([Id]),
                        CONSTRAINT [FK_ListingImages_Listings_ListingId] FOREIGN KEY ([ListingId]) REFERENCES [Listings] ([Id]) ON DELETE CASCADE
                    );

                    CREATE UNIQUE INDEX [UX_ListingImages_Listing_SortOrder]
                        ON [ListingImages] ([ListingId], [SortOrder]);
                END

                INSERT INTO [ListingImages] ([ListingId], [ImageUrl], [SortOrder], [CreatedAt])
                SELECT [Id], [ImageUrl], 0, COALESCE([CreatedAt], GETUTCDATE())
                FROM [Listings] AS [listing]
                WHERE [listing].[ImageUrl] IS NOT NULL
                  AND NOT EXISTS (
                      SELECT 1
                      FROM [ListingImages] AS [image]
                      WHERE [image].[ListingId] = [listing].[Id]
                  );
                """);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
                IF OBJECT_ID(N'[ListingImages]', N'U') IS NOT NULL
                BEGIN
                    DROP TABLE [ListingImages];
                END
                """);
        }
    }
}
