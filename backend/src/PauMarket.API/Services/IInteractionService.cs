using PauMarket.API.DTOs;

namespace PauMarket.API.Services;

public interface IInteractionService
{
    Task<bool> AddFavoriteAsync(AddFavoriteDto dto);
    Task<bool> RemoveFavoriteAsync(int userId, int listingId);
    Task<IEnumerable<ListingResponseDto>> GetUserFavoritesAsync(int userId);
}
