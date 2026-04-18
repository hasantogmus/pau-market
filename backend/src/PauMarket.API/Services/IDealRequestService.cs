using PauMarket.API.DTOs;

namespace PauMarket.API.Services;

public interface IDealRequestService
{
    Task<DealRequestResponseDto> CreateDealRequestAsync(int buyerId, CreateDealRequestDto dto);
    Task<DealRequestResponseDto?> GetMyDealRequestForListingAsync(int buyerId, int listingId);
    Task<DealRequestResponseDto> AcceptDealRequestAsync(int requestId, int sellerId);
    Task<DealRequestResponseDto> RejectDealRequestAsync(int requestId, int sellerId);
}
