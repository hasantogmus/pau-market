using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using PauMarket.API.Data;
using PauMarket.API.DTOs;
using PauMarket.API.Models;

namespace PauMarket.API.Services;

public class ListingService(PauMarketDbContext context, IMemoryCache cache) : IListingService
{
    // ── GET (herkese açık) ────────────────────────────────────────────────────

    public async Task<PagedResult<ListingResponseDto>> GetAllListingsAsync(ListingQueryParameters parameters)
    {
        // 1. "AllListings" adında bir Cache Key ile RAM'de veri var mı kontrol et
        if (!cache.TryGetValue("AllListings", out List<Listing>? allListings))
        {
            // 2. RAM'de yoksa veritabanından çek
            allListings = await context.Listings
                .Include(listing => listing.User)
                .AsNoTracking()
                .ToListAsync();

            // 3. 5 dakikalık AbsoluteExpiration (kesin ömür) belirle
            var cacheOptions = new MemoryCacheEntryOptions
            {
                AbsoluteExpiration = DateTimeOffset.UtcNow.AddMinutes(5)
            };

            // 4. Veriyi RAM'e kaydet
            cache.Set("AllListings", allListings, cacheOptions);
        }

        // Filtreleme ve sayfalamayı RAM'e aldığımız liste üzerinden (in-memory) yapıyoruz
        var query = (allListings ?? [])
            .Where(listing => listing.IsActive && !listing.IsSold)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(parameters.SearchTerm))
        {
            var searchTerm = parameters.SearchTerm.ToLower();
            query = query.Where(l => l.Title.ToLower().Contains(searchTerm) ||
                                     (l.Description ?? string.Empty).ToLower().Contains(searchTerm));
        }

        if (!string.IsNullOrWhiteSpace(parameters.Category))
        {
            var category = parameters.Category.ToLower();
            query = query.Where(l => l.Category.ToLower() == category);
        }

        if (parameters.MinPrice.HasValue)
            query = query.Where(l => l.Price >= parameters.MinPrice.Value);

        if (parameters.MaxPrice.HasValue)
            query = query.Where(l => l.Price <= parameters.MaxPrice.Value);

        var totalCount = query.Count();
        var items = query
            .OrderByDescending(l => l.CreatedAt)
            .Skip((parameters.PageNumber - 1) * parameters.PageSize)
            .Take(parameters.PageSize)
            .ToList();

        return new PagedResult<ListingResponseDto>
        {
            Items = items.Select(item => MapToResponseDto(item)),
            TotalCount = totalCount,
            PageNumber = parameters.PageNumber,
            PageSize = parameters.PageSize
        };
    }

    public async Task<ListingResponseDto?> GetListingByIdAsync(int id, int? callerId = null)
    {
        var listing = await context.Listings
            .Include(item => item.User)
            .Include(item => item.DealRequests)
                .ThenInclude(item => item.Buyer)
            .AsNoTracking()
            .FirstOrDefaultAsync(l => l.Id == id);

        if (listing is null)
            return null;

        if (listing.IsSold && !CanAccessSoldListing(listing, callerId))
            return null;

        return MapToResponseDto(listing, callerId);
    }

    public async Task<IEnumerable<ListingResponseDto>> GetPurchasedListingsAsync(int buyerId)
    {
        var listings = await context.Listings
            .Include(item => item.User)
            .Include(item => item.DealRequests)
                .ThenInclude(item => item.Buyer)
            .AsNoTracking()
            .Where(item => item.IsSold && item.SoldToUserId == buyerId)
            .OrderByDescending(item => item.SoldAt ?? item.CreatedAt)
            .ToListAsync();

        return listings.Select(item => MapToResponseDto(item, buyerId));
    }

    public async Task<IEnumerable<ListingResponseDto>> GetUserListingsAsync(int userId)
    {
        var listings = await context.Listings
            .Include(item => item.User)
            .Include(item => item.DealRequests)
                .ThenInclude(item => item.Buyer)
            .AsNoTracking()
            .Where(l => l.UserId == userId)
            .OrderByDescending(l => l.CreatedAt)
            .ToListAsync();

        return listings.Select(item => MapToResponseDto(item, userId));
    }

    // ── Kimlik doğrulaması ve Yetki gerekli ────────────────────────────────────

    /// <summary>
    /// Yeni ilan oluşturur.
    /// UserId, token'dan gelen callerId ile; ImageUrl ise Berke'nin sisteminden gelir.
    /// </summary>
    public async Task<ListingResponseDto> CreateListingAsync(CreateListingDto dto, int callerId, string imageUrl)
    {
        var listing = new Listing
        {
            UserId      = callerId,          // Hasan'ın güvenliği: Token'dan gelir
            Title       = dto.Title,
            Description = dto.Description,
            Price       = dto.Price,
            Category    = dto.Category,
            Condition   = dto.Condition,
            ImageUrl    = imageUrl,          // Berke'nin görseli: Buluttan gelir
            IsActive    = true,
            IsSold      = false,
            CreatedAt   = DateTime.UtcNow
        };

        context.Listings.Add(listing);
        await context.SaveChangesAsync();
        await context.Entry(listing).Reference(item => item.User).LoadAsync();

        // Cache Invalidation: Yeni ilan eklendi, eski önbelleği temizle
        cache.Remove("AllListings");

        return MapToResponseDto(listing, callerId);
    }

    /// <summary>
    /// İlanı günceller.
    /// callerId ilanın sahibiyle eşleşmiyorsa UnauthorizedAccessException fırlatır.
    /// </summary>
    public async Task<ListingResponseDto?> UpdateListingAsync(int id, UpdateListingDto dto, int callerId)
    {
        var listing = await context.Listings.FindAsync(id);
        if (listing is null) return null;

        // Sahiplik kontrolü (Hasan'ın güvenlik kuralı)
        if (listing.UserId != callerId)
            throw new UnauthorizedAccessException("Bu ilanı değiştirmeye yetkiniz yok.");

        listing.Title       = dto.Title;
        listing.Description = dto.Description;
        listing.Price       = dto.Price;
        listing.Category    = dto.Category;
        listing.Condition   = dto.Condition;
        listing.IsSold      = dto.IsSold;
        listing.SoldToUserId = dto.IsSold ? dto.SoldToUserId : null;
        listing.SoldAt      = dto.IsSold ? listing.SoldAt ?? DateTime.UtcNow : null;
        listing.IsActive    = dto.IsSold ? false : dto.IsActive;

        await context.SaveChangesAsync();
        await context.Entry(listing).Reference(item => item.User).LoadAsync();

        // Cache Invalidation: İlan güncellendi, eski önbelleği temizle
        cache.Remove("AllListings");

        return MapToResponseDto(listing, callerId);
    }

    /// <summary>
    /// İlanı siler.
    /// callerId ilanın sahibiyle eşleşmiyorsa UnauthorizedAccessException fırlatır.
    /// </summary>
    public async Task<bool> DeleteListingAsync(int id, int callerId)
    {
        var listing = await context.Listings.FindAsync(id);
        if (listing is null) return false;

        // Sahiplik kontrolü (Hasan'ın güvenlik kuralı)
        if (listing.UserId != callerId)
            throw new UnauthorizedAccessException("Bu ilanı silmeye yetkiniz yok.");

        context.Listings.Remove(listing);
        await context.SaveChangesAsync();

        // Cache Invalidation: İlan silindi, eski önbelleği temizle
        cache.Remove("AllListings");

        return true;
    }

    public async Task<ListingResponseDto?> MarkListingSoldAsync(int id, bool isSold, int callerId, int? soldToUserId = null)
    {
        var listing = await context.Listings
            .Include(item => item.User)
            .Include(item => item.DealRequests)
                .ThenInclude(item => item.Buyer)
            .FirstOrDefaultAsync(item => item.Id == id);

        if (listing is null) return null;

        if (listing.UserId != callerId)
            throw new UnauthorizedAccessException("Bu ilanın satış durumunu değiştirmeye yetkiniz yok.");

        if (isSold)
        {
            if (soldToUserId is null)
                throw new InvalidOperationException("İlanı satıldı yapmak için önce kabul edilmiş bir anlaşma isteği seçmelisiniz.");

            if (soldToUserId == callerId)
                throw new InvalidOperationException("Satıcı kendi ilanını kendine satılmış olarak işaretleyemez.");

            var acceptedRequest = listing.DealRequests.FirstOrDefault(item =>
                item.BuyerId == soldToUserId &&
                item.SellerId == callerId &&
                item.Status == DealRequestStatus.Accepted);

            if (acceptedRequest is null)
                throw new InvalidOperationException("İlan ancak kabul edilmiş bir anlaşma isteği üzerinden satıldı yapılabilir.");
        }

        listing.IsSold = isSold;
        listing.SoldAt = isSold ? DateTime.UtcNow : null;
        listing.SoldToUserId = isSold ? soldToUserId : null;
        listing.IsActive = !isSold;

        await context.SaveChangesAsync();
        cache.Remove("AllListings");

        if (isSold && soldToUserId is int buyerId)
        {
            var alreadyTracked = await context.Interactions.AnyAsync(interaction =>
                interaction.UserId == buyerId &&
                interaction.ListingId == listing.Id &&
                interaction.InteractionType == InteractionType.Purchase);

            if (!alreadyTracked)
            {
                context.Interactions.Add(new Interaction
                {
                    UserId = buyerId,
                    ListingId = listing.Id,
                    InteractionType = InteractionType.Purchase,
                    Timestamp = DateTime.UtcNow
                });

                await context.SaveChangesAsync();
            }
        }

        return MapToResponseDto(listing);
    }

    // ── Helper ───────────────────────────────────────────────────────────────

    private static ListingResponseDto MapToResponseDto(Listing listing, int? viewerId = null)
    {
        var acceptedRequest = listing.DealRequests?.FirstOrDefault(item => item.Status == DealRequestStatus.Accepted);
        var canSeeAcceptedBuyer = acceptedRequest is not null &&
                                  viewerId is not null &&
                                  (viewerId == listing.UserId || viewerId == acceptedRequest.BuyerId);
        var canSeeSoldBuyer = listing.IsSold &&
                              viewerId is not null &&
                              listing.SoldToUserId is not null &&
                              (viewerId == listing.UserId || viewerId == listing.SoldToUserId);
        var soldBuyerName = listing.IsSold
            ? listing.DealRequests?.FirstOrDefault(item => item.BuyerId == listing.SoldToUserId)?.Buyer is User soldBuyer
                ? $"{soldBuyer.FirstName} {soldBuyer.LastName}".Trim()
                : null
            : null;

        return new ListingResponseDto
        {
            Id = listing.Id,
            UserId = listing.UserId,
            SellerName = listing.User is null ? null : $"{listing.User.FirstName} {listing.User.LastName}".Trim(),
            AcceptedBuyerId = canSeeAcceptedBuyer ? acceptedRequest?.BuyerId : null,
            AcceptedBuyerName = canSeeAcceptedBuyer && acceptedRequest?.Buyer is not null ? $"{acceptedRequest.Buyer.FirstName} {acceptedRequest.Buyer.LastName}".Trim() : null,
            Title = listing.Title,
            Description = listing.Description,
            Price = listing.Price,
            Category = listing.Category,
            Condition = listing.Condition,
            ImageUrl = listing.ImageUrl,
            IsActive = listing.IsActive,
            IsSold = listing.IsSold,
            SoldAt = listing.SoldAt,
            SoldToUserId = listing.SoldToUserId,
            SoldToUserName = canSeeSoldBuyer ? soldBuyerName : null,
            CreatedAt = listing.CreatedAt
        };
    }

    private static bool CanAccessSoldListing(Listing listing, int? callerId)
    {
        if (!listing.IsSold)
            return true;

        if (callerId is null || listing.SoldToUserId is null)
            return false;

        return callerId == listing.UserId || callerId == listing.SoldToUserId;
    }
}
