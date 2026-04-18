using Microsoft.EntityFrameworkCore;
using PauMarket.API.Data;
using PauMarket.API.DTOs;
using PauMarket.API.Models;

namespace PauMarket.API.Services;

public class DealRequestService(PauMarketDbContext db) : IDealRequestService
{
    public async Task<DealRequestResponseDto> CreateDealRequestAsync(int buyerId, CreateDealRequestDto dto)
    {
        var listing = await db.Listings
            .Include(item => item.User)
            .FirstOrDefaultAsync(item => item.Id == dto.ListingId);

        if (listing is null)
            throw new InvalidOperationException("Anlaşma isteği gönderilecek ilan bulunamadı.");

        if (listing.UserId == buyerId)
            throw new InvalidOperationException("Kendi ilanınız için anlaşma isteği gönderemezsiniz.");

        if (listing.IsSold)
            throw new InvalidOperationException("Satılmış ilan için yeni anlaşma isteği gönderilemez.");

        var existingRequest = await db.DealRequests
            .Include(request => request.Buyer)
            .Include(request => request.Seller)
            .Include(request => request.Listing)
            .FirstOrDefaultAsync(request => request.ListingId == dto.ListingId && request.BuyerId == buyerId);

        if (existingRequest is not null)
        {
            if (existingRequest.Status == DealRequestStatus.Pending)
                throw new InvalidOperationException("Bu ilan için zaten bekleyen bir anlaşma isteğiniz var.");

            if (existingRequest.Status == DealRequestStatus.Accepted)
                throw new InvalidOperationException("Bu ilan için anlaşma isteğiniz zaten kabul edilmiş.");

            existingRequest.Status = DealRequestStatus.Pending;
            existingRequest.Note = dto.Note?.Trim();
            existingRequest.RequestedAt = DateTime.UtcNow;
            existingRequest.RespondedAt = null;

            await db.SaveChangesAsync();
            return MapToDto(existingRequest);
        }

        var buyer = await db.Users.FirstAsync(user => user.Id == buyerId);

        var dealRequest = new DealRequest
        {
            ListingId = listing.Id,
            BuyerId = buyerId,
            SellerId = listing.UserId,
            Note = dto.Note?.Trim(),
            Status = DealRequestStatus.Pending,
            RequestedAt = DateTime.UtcNow,
        };

        db.DealRequests.Add(dealRequest);
        await db.SaveChangesAsync();

        dealRequest.Buyer = buyer;
        dealRequest.Seller = listing.User;
        dealRequest.Listing = listing;

        return MapToDto(dealRequest);
    }

    public async Task<DealRequestResponseDto?> GetMyDealRequestForListingAsync(int buyerId, int listingId)
    {
        var request = await db.DealRequests
            .AsNoTracking()
            .Include(item => item.Listing)
            .Include(item => item.Buyer)
            .Include(item => item.Seller)
            .FirstOrDefaultAsync(item => item.BuyerId == buyerId && item.ListingId == listingId);

        return request is null ? null : MapToDto(request);
    }

    public async Task<DealRequestResponseDto> AcceptDealRequestAsync(int requestId, int sellerId)
    {
        var request = await db.DealRequests
            .Include(item => item.Buyer)
            .Include(item => item.Seller)
            .Include(item => item.Listing)
            .FirstOrDefaultAsync(item => item.Id == requestId);

        if (request is null)
            throw new InvalidOperationException("Anlaşma isteği bulunamadı.");

        if (request.SellerId != sellerId)
            throw new UnauthorizedAccessException("Bu anlaşma isteğini yanıtlamaya yetkiniz yok.");

        if (request.Status != DealRequestStatus.Pending)
            throw new InvalidOperationException("Bu anlaşma isteği zaten yanıtlanmış.");

        request.Status = DealRequestStatus.Accepted;
        request.RespondedAt = DateTime.UtcNow;

        var competingRequests = await db.DealRequests
            .Where(item => item.ListingId == request.ListingId && item.Id != request.Id && item.Status == DealRequestStatus.Pending)
            .ToListAsync();

        foreach (var competing in competingRequests)
        {
            competing.Status = DealRequestStatus.Rejected;
            competing.RespondedAt = DateTime.UtcNow;
        }

        await db.SaveChangesAsync();
        return MapToDto(request);
    }

    public async Task<DealRequestResponseDto> RejectDealRequestAsync(int requestId, int sellerId)
    {
        var request = await db.DealRequests
            .Include(item => item.Buyer)
            .Include(item => item.Seller)
            .Include(item => item.Listing)
            .FirstOrDefaultAsync(item => item.Id == requestId);

        if (request is null)
            throw new InvalidOperationException("Anlaşma isteği bulunamadı.");

        if (request.SellerId != sellerId)
            throw new UnauthorizedAccessException("Bu anlaşma isteğini yanıtlamaya yetkiniz yok.");

        if (request.Status != DealRequestStatus.Pending)
            throw new InvalidOperationException("Bu anlaşma isteği zaten yanıtlanmış.");

        request.Status = DealRequestStatus.Rejected;
        request.RespondedAt = DateTime.UtcNow;

        await db.SaveChangesAsync();
        return MapToDto(request);
    }

    private static DealRequestResponseDto MapToDto(DealRequest request) => new()
    {
        Id = request.Id,
        ListingId = request.ListingId,
        ListingTitle = request.Listing?.Title ?? string.Empty,
        BuyerId = request.BuyerId,
        BuyerName = request.Buyer is null ? string.Empty : $"{request.Buyer.FirstName} {request.Buyer.LastName}".Trim(),
        SellerId = request.SellerId,
        SellerName = request.Seller is null ? string.Empty : $"{request.Seller.FirstName} {request.Seller.LastName}".Trim(),
        Status = request.Status.ToString(),
        Note = request.Note,
        RequestedAt = request.RequestedAt,
        RespondedAt = request.RespondedAt,
    };
}
