using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PauMarket.API.Data;
using PauMarket.API.DTOs;
using PauMarket.API.Models;

namespace PauMarket.API.Controllers;

/// <summary>
/// Yalnızca Admin rolündeki kullanıcıların erişebildiği endpoint'ler.
/// </summary>
[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "Admin")]
public class AdminController(PauMarketDbContext db) : ControllerBase
{
    /// <summary>
    /// Admin kontrol paneli istatistikleri — yalnızca Admin rolü erişebilir.
    /// </summary>
    [HttpGet("dashboard-stats")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> GetDashboardStats()
    {
        var pendingModerationCount = await db.Listings
            .CountAsync(listing => listing.ModerationStatus == ListingModerationStatus.Pending);

        return Ok(new
        {
            message = "Sadece adminler görebilir.",
            pendingModerationCount
        });
    }

    /// <summary>
    /// Admin moderasyon kuyruğundaki ilanları listeler.
    /// </summary>
    [HttpGet("moderation/listings")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<ActionResult<IEnumerable<ListingResponseDto>>> GetModerationListings([FromQuery] string status = "pending")
    {
        var normalizedStatus = status.Trim().ToLowerInvariant();
        var query = db.Listings
            .Include(listing => listing.User)
            .Include(listing => listing.Images)
            .AsNoTracking()
            .AsQueryable();

        query = normalizedStatus switch
        {
            "approved" => query.Where(listing => listing.ModerationStatus == ListingModerationStatus.Approved),
            "rejected" => query.Where(listing => listing.ModerationStatus == ListingModerationStatus.Rejected),
            _ => query.Where(listing => listing.ModerationStatus == ListingModerationStatus.Pending)
        };

        var listings = await query
            .OrderByDescending(listing => listing.CreatedAt)
            .Take(100)
            .ToListAsync();

        return Ok(listings.Select(MapToResponseDto));
    }

    /// <summary>
    /// Bir ilanı admin incelemesinden geçirip yayına alır.
    /// </summary>
    [HttpPost("moderation/listings/{id:int}/approve")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<ActionResult<ListingResponseDto>> ApproveListing(int id)
    {
        var listing = await LoadListingForModeration(id);
        if (listing is null)
            return NotFound(new { message = "İlan bulunamadı." });

        listing.IsApproved = true;
        listing.ModerationStatus = ListingModerationStatus.Approved;
        listing.ModerationReason = null;
        listing.IsActive = !listing.IsSold;

        await db.SaveChangesAsync();
        return Ok(MapToResponseDto(listing));
    }

    /// <summary>
    /// Bir ilanı admin incelemesinde reddeder.
    /// </summary>
    [HttpPost("moderation/listings/{id:int}/reject")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<ActionResult<ListingResponseDto>> RejectListing(int id, [FromBody] ModerateListingDto dto)
    {
        var listing = await LoadListingForModeration(id);
        if (listing is null)
            return NotFound(new { message = "İlan bulunamadı." });

        var reason = dto.Reason?.Trim();
        listing.IsApproved = false;
        listing.ModerationStatus = ListingModerationStatus.Rejected;
        listing.ModerationReason = string.IsNullOrWhiteSpace(reason)
            ? "İlan platform kurallarına uygun bulunmadı."
            : reason;

        await db.SaveChangesAsync();
        return Ok(MapToResponseDto(listing));
    }

    private async Task<Listing?> LoadListingForModeration(int id)
    {
        return await db.Listings
            .Include(listing => listing.User)
            .Include(listing => listing.Images)
            .FirstOrDefaultAsync(listing => listing.Id == id);
    }

    private static ListingResponseDto MapToResponseDto(Listing listing)
    {
        var imageUrls = listing.Images?
            .OrderBy(image => image.SortOrder)
            .Select(image => image.ImageUrl)
            .Where(url => !string.IsNullOrWhiteSpace(url))
            .ToList() ?? [];

        if (imageUrls.Count == 0 && !string.IsNullOrWhiteSpace(listing.ImageUrl))
            imageUrls.Add(listing.ImageUrl);

        return new ListingResponseDto
        {
            Id = listing.Id,
            UserId = listing.UserId,
            SellerName = listing.User is null ? null : $"{listing.User.FirstName} {listing.User.LastName}".Trim(),
            Title = listing.Title,
            Description = listing.Description,
            Price = listing.Price,
            Category = listing.Category,
            Condition = listing.Condition,
            ImageUrl = listing.ImageUrl ?? imageUrls.FirstOrDefault(),
            ImageUrls = imageUrls,
            IsActive = listing.IsActive,
            IsSold = listing.IsSold,
            IsApproved = listing.IsApproved,
            ModerationStatus = (int)listing.ModerationStatus,
            ModerationStatusName = listing.ModerationStatus.ToString(),
            ModerationReason = listing.ModerationReason,
            SoldAt = listing.SoldAt,
            SoldToUserId = listing.SoldToUserId,
            CreatedAt = listing.CreatedAt
        };
    }
}
