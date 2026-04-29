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
public class AdminController(PauMarketDbContext db, IConfiguration configuration) : ControllerBase
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
        var now = DateTime.UtcNow;
        var sevenDaysAgo = now.AddDays(-7);

        var totalUsers = await db.Users.CountAsync();
        var verifiedUsers = await db.Users.CountAsync(user => user.IsEmailVerified);
        var adminUsers = await db.Users.CountAsync(user => user.Role == "Admin");
        var newUsersLast7Days = await db.Users.CountAsync(user => user.CreatedAt >= sevenDaysAgo);

        var totalListings = await db.Listings.CountAsync();
        var pendingListings = await db.Listings.CountAsync(listing => listing.ModerationStatus == ListingModerationStatus.Pending);
        var approvedListings = await db.Listings.CountAsync(listing => listing.ModerationStatus == ListingModerationStatus.Approved);
        var rejectedListings = await db.Listings.CountAsync(listing => listing.ModerationStatus == ListingModerationStatus.Rejected);
        var activeListings = await db.Listings.CountAsync(listing => listing.IsActive && listing.IsApproved && !listing.IsSold);
        var soldListings = await db.Listings.CountAsync(listing => listing.IsSold);
        var totalPortfolioValue = await db.Listings.SumAsync(listing => (decimal?)listing.Price) ?? 0;
        var soldPortfolioValue = await db.Listings.Where(listing => listing.IsSold).SumAsync(listing => (decimal?)listing.Price) ?? 0;

        var totalDeals = await db.DealRequests.CountAsync();
        var pendingDeals = await db.DealRequests.CountAsync(deal => deal.Status == DealRequestStatus.Pending);
        var acceptedDeals = await db.DealRequests.CountAsync(deal => deal.Status == DealRequestStatus.Accepted);
        var rejectedDeals = await db.DealRequests.CountAsync(deal => deal.Status == DealRequestStatus.Rejected);
        var withdrawnDeals = await db.DealRequests.CountAsync(deal => deal.Status == DealRequestStatus.Withdrawn);
        var cancelledDeals = await db.DealRequests.CountAsync(deal => deal.Status == DealRequestStatus.Cancelled);

        var messageCount = await db.Messages.CountAsync();
        var unreadMessageCount = await db.Messages.CountAsync(message => !message.IsRead);
        var reviewCount = await db.Reviews.CountAsync();
        var interactionCount = await db.Interactions.CountAsync();
        var favoriteCount = await db.Interactions.CountAsync(interaction => interaction.InteractionType == InteractionType.Favorite);
        var viewCount = await db.Interactions.CountAsync(interaction => interaction.InteractionType == InteractionType.View);

        var topCategories = await db.Listings
            .AsNoTracking()
            .Where(listing => listing.IsApproved)
            .GroupBy(listing => listing.Category)
            .Select(group => new
            {
                category = group.Key,
                count = group.Count(),
                soldCount = group.Count(listing => listing.IsSold),
                totalValue = group.Sum(listing => listing.Price)
            })
            .OrderByDescending(item => item.count)
            .Take(6)
            .ToListAsync();

        var recentListings = await db.Listings
            .AsNoTracking()
            .Include(listing => listing.User)
            .OrderByDescending(listing => listing.CreatedAt)
            .Take(6)
            .Select(listing => new
            {
                listing.Id,
                listing.Title,
                listing.Price,
                listing.Category,
                listing.CreatedAt,
                moderationStatus = listing.ModerationStatus.ToString(),
                sellerName = $"{listing.User.FirstName} {listing.User.LastName}".Trim()
            })
            .ToListAsync();

        var recentUsers = await db.Users
            .AsNoTracking()
            .OrderByDescending(user => user.CreatedAt)
            .Take(6)
            .Select(user => new
            {
                user.Id,
                fullName = $"{user.FirstName} {user.LastName}".Trim(),
                user.Email,
                user.Department,
                user.Grade,
                user.Role,
                user.IsEmailVerified,
                user.CreatedAt
            })
            .ToListAsync();

        var recentDeals = await BuildRecentDealsQuery()
            .Take(6)
            .ToListAsync();

        return Ok(new
        {
            generatedAt = now,
            users = new
            {
                total = totalUsers,
                verified = verifiedUsers,
                admins = adminUsers,
                newLast7Days = newUsersLast7Days,
                verificationRate = totalUsers == 0 ? 0 : Math.Round((double)verifiedUsers / totalUsers * 100, 1)
            },
            listings = new
            {
                total = totalListings,
                pending = pendingListings,
                approved = approvedListings,
                rejected = rejectedListings,
                active = activeListings,
                sold = soldListings,
                totalValue = totalPortfolioValue,
                soldValue = soldPortfolioValue
            },
            deals = new
            {
                total = totalDeals,
                pending = pendingDeals,
                accepted = acceptedDeals,
                rejected = rejectedDeals,
                withdrawn = withdrawnDeals,
                cancelled = cancelledDeals
            },
            engagement = new
            {
                messages = messageCount,
                unreadMessages = unreadMessageCount,
                reviews = reviewCount,
                interactions = interactionCount,
                favorites = favoriteCount,
                views = viewCount
            },
            moderation = new
            {
                pendingCount = pendingListings,
                automaticModerationEnabled = configuration.GetValue("Moderation:EnableAutomaticModeration", false)
            },
            topCategories,
            recentListings,
            recentUsers,
            recentDeals
        });
    }

    /// <summary>
    /// Admin kullanıcı yönetimi ekranı için kullanıcıları okuma amaçlı listeler.
    /// </summary>
    [HttpGet("users")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> GetUsers([FromQuery] string? search = null)
    {
        var normalizedSearch = search?.Trim().ToLowerInvariant();
        var query = db.Users.AsNoTracking();

        if (!string.IsNullOrWhiteSpace(normalizedSearch))
        {
            query = query.Where(user =>
                user.FirstName.ToLower().Contains(normalizedSearch) ||
                user.LastName.ToLower().Contains(normalizedSearch) ||
                user.Email.ToLower().Contains(normalizedSearch) ||
                (user.Department != null && user.Department.ToLower().Contains(normalizedSearch)));
        }

        var users = await query
            .OrderByDescending(user => user.CreatedAt)
            .Take(100)
            .Select(user => new
            {
                user.Id,
                fullName = $"{user.FirstName} {user.LastName}".Trim(),
                user.Email,
                user.Department,
                user.Grade,
                user.Role,
                user.IsEmailVerified,
                user.CreatedAt,
                listingCount = user.Listings.Count,
                soldListingCount = user.Listings.Count(listing => listing.IsSold),
                activeListingCount = user.Listings.Count(listing => listing.IsActive && listing.IsApproved && !listing.IsSold)
            })
            .ToListAsync();

        return Ok(users);
    }

    /// <summary>
    /// Admin panelinde son anlaşma/satış hareketlerini gösterir.
    /// </summary>
    [HttpGet("deals/recent")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> GetRecentDeals()
    {
        var deals = await BuildRecentDealsQuery()
            .Take(30)
            .ToListAsync();

        return Ok(deals);
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

    private IQueryable<AdminRecentDealDto> BuildRecentDealsQuery()
    {
        return db.DealRequests
            .AsNoTracking()
            .Include(deal => deal.Listing)
            .Include(deal => deal.Buyer)
            .Include(deal => deal.Seller)
            .OrderByDescending(deal => deal.RespondedAt ?? deal.RequestedAt)
            .Select(deal => new AdminRecentDealDto(
                deal.Id,
                deal.ListingId,
                deal.Listing.Title,
                deal.Listing.Price,
                deal.Status.ToString(),
                deal.RequestedAt,
                deal.RespondedAt,
                deal.BuyerId,
                $"{deal.Buyer.FirstName} {deal.Buyer.LastName}".Trim(),
                deal.SellerId,
                $"{deal.Seller.FirstName} {deal.Seller.LastName}".Trim()
            ));
    }

    private sealed record AdminRecentDealDto(
        int Id,
        int ListingId,
        string ListingTitle,
        decimal ListingPrice,
        string Status,
        DateTime RequestedAt,
        DateTime? RespondedAt,
        int BuyerId,
        string BuyerName,
        int SellerId,
        string SellerName);

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
