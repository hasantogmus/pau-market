using System.Globalization;
using System.Text;
using Microsoft.EntityFrameworkCore;
using PauMarket.API.Data;
using PauMarket.API.Models;

namespace PauMarket.API.Services;

public class RecommenderExportService(PauMarketDbContext db) : IRecommenderExportService
{
    public async Task<string> BuildInteractionsCsvAsync()
    {
        var rows = new List<InteractionExportRow>();

        var interactions = await db.Interactions
            .AsNoTracking()
            .OrderBy(interaction => interaction.Timestamp)
            .Select(interaction => new
            {
                interaction.UserId,
                interaction.ListingId,
                interaction.InteractionType,
                interaction.Timestamp
            })
            .ToListAsync();

        rows.AddRange(interactions.Select(interaction => new InteractionExportRow(
            interaction.UserId,
            interaction.ListingId,
            ToEventName(interaction.InteractionType),
            interaction.InteractionType.ToRecommenderWeight(),
            interaction.Timestamp
        )));

        var exportedViewKeys = interactions
            .Where(interaction => interaction.InteractionType == InteractionType.View)
            .Select(interaction => (interaction.UserId, interaction.ListingId))
            .ToHashSet();

        var legacyViews = await db.UserViews
            .AsNoTracking()
            .OrderBy(view => view.ViewedAt)
            .Select(view => new
            {
                view.UserId,
                view.ListingId,
                view.ViewedAt
            })
            .ToListAsync();

        rows.AddRange(legacyViews
            .Where(view => !exportedViewKeys.Contains((view.UserId, view.ListingId)))
            .Select(view => new InteractionExportRow(
                view.UserId,
                view.ListingId,
                "view",
                InteractionType.View.ToRecommenderWeight(),
                view.ViewedAt
            )));

        var csv = new StringBuilder();
        csv.AppendLine("user_id,listing_id,event,timestamp,weight");

        foreach (var row in rows.OrderBy(row => row.Timestamp))
        {
            csv.AppendCsvRow(
                row.UserId.ToString(CultureInfo.InvariantCulture),
                row.ListingId.ToString(CultureInfo.InvariantCulture),
                row.EventName,
                row.Timestamp.ToUniversalTime().ToString("O", CultureInfo.InvariantCulture),
                row.Weight.ToString("0.###", CultureInfo.InvariantCulture)
            );
        }

        return csv.ToString();
    }

    public async Task<string> BuildListingsCsvAsync()
    {
        var listings = await db.Listings
            .AsNoTracking()
            .OrderBy(listing => listing.Id)
            .Select(listing => new
            {
                listing.Id,
                listing.Category,
                listing.Condition,
                listing.Price,
                listing.Title,
                listing.Description,
                listing.IsActive,
                listing.IsSold,
                listing.CreatedAt
            })
            .ToListAsync();

        var csv = new StringBuilder();
        csv.AppendLine("listing_id,category,condition,price,title,description,is_active,is_sold,created_at");

        foreach (var listing in listings)
        {
            csv.AppendCsvRow(
                listing.Id.ToString(CultureInfo.InvariantCulture),
                listing.Category,
                listing.Condition,
                listing.Price.ToString("0.##", CultureInfo.InvariantCulture),
                listing.Title,
                listing.Description ?? string.Empty,
                listing.IsActive.ToString(CultureInfo.InvariantCulture).ToLowerInvariant(),
                listing.IsSold.ToString(CultureInfo.InvariantCulture).ToLowerInvariant(),
                listing.CreatedAt.ToUniversalTime().ToString("O", CultureInfo.InvariantCulture)
            );
        }

        return csv.ToString();
    }

    private static string ToEventName(InteractionType interactionType) => interactionType switch
    {
        InteractionType.View => "view",
        InteractionType.Message => "message",
        InteractionType.Favorite => "favorite",
        InteractionType.DealRequest => "deal_request",
        InteractionType.DealAccepted => "deal_accepted",
        InteractionType.Purchase => "purchase",
        _ => "view"
    };

    private sealed record InteractionExportRow(
        int UserId,
        int ListingId,
        string EventName,
        double Weight,
        DateTime Timestamp);
}

internal static class CsvBuilderExtensions
{
    public static void AppendCsvRow(this StringBuilder builder, params string[] values)
    {
        builder.AppendLine(string.Join(",", values.Select(EscapeCsv)));
    }

    private static string EscapeCsv(string value)
    {
        if (value.Contains('"'))
        {
            value = value.Replace("\"", "\"\"");
        }

        if (value.Contains(',') || value.Contains('"') || value.Contains('\n') || value.Contains('\r'))
        {
            return $"\"{value}\"";
        }

        return value;
    }
}
