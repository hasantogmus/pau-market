using Microsoft.EntityFrameworkCore;
using PauMarket.API.Data;
using PauMarket.API.DTOs;
using PauMarket.API.Models;

namespace PauMarket.API.Services;

public class InteractionService(PauMarketDbContext context) : IInteractionService
{
    public async Task<bool> AddFavoriteAsync(AddFavoriteDto dto)
    {
        // İlan var mı kontrolü
        var listingExists = await context.Listings.AnyAsync(l => l.Id == dto.ListingId);
        if (!listingExists) return false;

        // Kullanıcı var mı kontrolü
        var userExists = await context.Users.AnyAsync(u => u.Id == dto.UserId);
        if (!userExists) return false;

        // Aynı kullanıcı aynı ilanı daha önce favoriye eklemiş mi?
        var existingFavorite = await context.Interactions.FirstOrDefaultAsync(
            i => i.UserId == dto.UserId && 
                 i.ListingId == dto.ListingId && 
                 i.InteractionType == InteractionType.Favorite);

        if (existingFavorite != null)
        {
            // Zaten favorilere eklenmiş.
            return false; 
        }

        var interaction = new Interaction
        {
            UserId = dto.UserId,
            ListingId = dto.ListingId,
            InteractionType = InteractionType.Favorite,
            Timestamp = DateTime.UtcNow
        };

        context.Interactions.Add(interaction);
        await context.SaveChangesAsync();

        return true;
    }

    public async Task<bool> RemoveFavoriteAsync(int userId, int listingId)
    {
        var favoriteInteraction = await context.Interactions.FirstOrDefaultAsync(
            i => i.UserId == userId && 
                 i.ListingId == listingId && 
                 i.InteractionType == InteractionType.Favorite);

        if (favoriteInteraction == null) return false;

        context.Interactions.Remove(favoriteInteraction);
        await context.SaveChangesAsync();

        return true;
    }

    public async Task<IEnumerable<ListingResponseDto>> GetUserFavoritesAsync(int userId)
    {
        var favoriteListings = await context.Interactions
            .Where(i => i.UserId == userId && i.InteractionType == InteractionType.Favorite)
            .Include(i => i.Listing)
            .Select(i => i.Listing)
            .AsNoTracking()
            .ToListAsync();

        return favoriteListings.Select(MapToResponseDto);
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
            IsActive = listing.IsActive,
            CreatedAt = listing.CreatedAt
        };
    }
}
