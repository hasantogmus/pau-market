using PauMarket.API.DTOs;

namespace PauMarket.API.Services;

public interface IInteractionService
{
    Task<bool> AddFavoriteAsync(int userId, int listingId);
    Task<bool> RemoveFavoriteAsync(int userId, int listingId);
    Task<IEnumerable<ListingResponseDto>> GetUserFavoritesAsync(int userId);
}
