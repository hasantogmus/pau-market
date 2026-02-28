using PauMarket.API.DTOs;

namespace PauMarket.API.Services;

public interface IListingService
{
    Task<IEnumerable<ListingResponseDto>> GetAllListingsAsync();
    Task<ListingResponseDto?> GetListingByIdAsync(int id);
    Task<ListingResponseDto> CreateListingAsync(CreateListingDto dto, string imageUrl);
    Task<ListingResponseDto?> UpdateListingAsync(int id, UpdateListingDto dto);
    Task<bool> DeleteListingAsync(int id);
}
