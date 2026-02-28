using Microsoft.EntityFrameworkCore;
using PauMarket.API.Data;
using PauMarket.API.DTOs;
using PauMarket.API.Models;

namespace PauMarket.API.Services;

public class ListingService(PauMarketDbContext context) : IListingService
{
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

        if (listing == null) return null;

        return MapToResponseDto(listing);
    }

    public async Task<ListingResponseDto> CreateListingAsync(CreateListingDto dto, string imageUrl)
    {
        var listing = new Listing
        {
            UserId = dto.UserId,
            Title = dto.Title,
            Description = dto.Description,
            Price = dto.Price,
            Category = dto.Category,
            Condition = dto.Condition,
            ImageUrl = imageUrl,
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };

        context.Listings.Add(listing);
        await context.SaveChangesAsync();

        return MapToResponseDto(listing);
    }

    public async Task<ListingResponseDto?> UpdateListingAsync(int id, UpdateListingDto dto)
    {
        var listing = await context.Listings.FindAsync(id);

        if (listing == null) return null;

        listing.Title = dto.Title;
        listing.Description = dto.Description;
        listing.Price = dto.Price;
        listing.Category = dto.Category;
        listing.Condition = dto.Condition;
        listing.IsActive = dto.IsActive;

        await context.SaveChangesAsync();

        return MapToResponseDto(listing);
    }

    public async Task<bool> DeleteListingAsync(int id)
    {
        var listing = await context.Listings.FindAsync(id);

        if (listing == null) return false;

        context.Listings.Remove(listing);
        await context.SaveChangesAsync();

        return true;
    }

    private static ListingResponseDto MapToResponseDto(Listing listing)
    {
        return new ListingResponseDto
        {
            Id = listing.Id,
            UserId = listing.UserId,
            Title = listing.Title,
            Description = listing.Description,
            Price = listing.Price,
            Category = listing.Category,
            Condition = listing.Condition,
            ImageUrl = listing.ImageUrl,
            IsActive = listing.IsActive,
            CreatedAt = listing.CreatedAt
        };
    }
}
