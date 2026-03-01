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
            allListings = await context.Listings.AsNoTracking().ToListAsync();

            // 3. 5 dakikalık AbsoluteExpiration (kesin ömür) belirle
            var cacheOptions = new MemoryCacheEntryOptions
            {
                AbsoluteExpiration = DateTimeOffset.UtcNow.AddMinutes(5)
            };

            // 4. Veriyi RAM'e kaydet
            cache.Set("AllListings", allListings, cacheOptions);
        }

        // Filtreleme ve sayfalamayı RAM'e aldığımız liste üzerinden (in-memory) yapıyoruz
        var query = allListings!.AsQueryable();

        if (!string.IsNullOrWhiteSpace(parameters.SearchTerm))
        {
            var searchTerm = parameters.SearchTerm.ToLower();
            query = query.Where(l => l.Title.ToLower().Contains(searchTerm) || 
                                     l.Description.ToLower().Contains(searchTerm));
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
            Items = items.Select(MapToResponseDto),
            TotalCount = totalCount,
            PageNumber = parameters.PageNumber,
            PageSize = parameters.PageSize
        };
    }

    public async Task<ListingResponseDto?> GetListingByIdAsync(int id)
    {
        var listing = await context.Listings
            .AsNoTracking()
            .FirstOrDefaultAsync(l => l.Id == id);

        return listing is null ? null : MapToResponseDto(listing);
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
            CreatedAt   = DateTime.UtcNow
        };

        context.Listings.Add(listing);
        await context.SaveChangesAsync();

        // Cache Invalidation: Yeni ilan eklendi, eski önbelleği temizle
        cache.Remove("AllListings");

        return MapToResponseDto(listing);
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
        listing.IsActive    = listing.IsActive;

        await context.SaveChangesAsync();

        // Cache Invalidation: İlan güncellendi, eski önbelleği temizle
        cache.Remove("AllListings");

        return MapToResponseDto(listing);
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

    // ── Helper ───────────────────────────────────────────────────────────────

    private static ListingResponseDto MapToResponseDto(Listing listing) => new()
    {
        Id          = listing.Id,
        UserId      = listing.UserId,
        Title       = listing.Title,
        Description = listing.Description,
        Price       = listing.Price,
        Category    = listing.Category,
        Condition   = listing.Condition,
        ImageUrl    = listing.ImageUrl, // Berke'nin eklediği alan
        IsActive    = listing.IsActive,
        CreatedAt   = listing.CreatedAt
    };
}