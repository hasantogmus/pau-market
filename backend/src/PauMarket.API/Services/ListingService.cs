using Microsoft.EntityFrameworkCore;
using PauMarket.API.Data;
using PauMarket.API.DTOs;
using PauMarket.API.Models;

namespace PauMarket.API.Services;

public class ListingService(PauMarketDbContext context) : IListingService
{
    // ── GET (herkese açık) ────────────────────────────────────────────────────

    public async Task<IEnumerable<ListingResponseDto>> GetAllListingsAsync()
    {
        var listings = await context.Listings
            .AsNoTracking()
            .ToListAsync();

        return listings.Select(MapToResponseDto);
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