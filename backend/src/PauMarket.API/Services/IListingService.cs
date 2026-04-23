using PauMarket.API.DTOs;

namespace PauMarket.API.Services;

public interface IListingService
{
    // ── Herkese açık ──────────────────────────────────────────────────────────
    Task<PagedResult<ListingResponseDto>> GetAllListingsAsync(ListingQueryParameters parameters);
    Task<ListingResponseDto?> GetListingByIdAsync(int id, int? callerId = null);
    Task<IEnumerable<ListingResponseDto>> GetUserListingsAsync(int userId);
    Task<IEnumerable<ListingResponseDto>> GetPurchasedListingsAsync(int buyerId);

    // ── Kimlik doğrulaması ve Yetki gerekli ────────────────────────────────────

    /// <summary>
    /// Yeni ilan oluşturur. 
    /// <paramref name="callerId"/> token'dan alınan kullanıcı ID'sidir.
    /// <paramref name="imageUrls"/> buluta yüklenmiş sıralı fotoğraf adresleridir.
    /// </summary>
    Task<ListingResponseDto> CreateListingAsync(CreateListingDto dto, int callerId, IReadOnlyList<string> imageUrls);

    /// <summary>
    /// İlanı günceller. Yalnızca ilanın sahibi (<paramref name="callerId"/>) işlem yapabilir.
    /// Sahip değilse UnauthorizedAccessException fırlatır.
    /// </summary>
    Task<ListingResponseDto?> UpdateListingAsync(int id, UpdateListingDto dto, int callerId);

    /// <summary>
    /// İlan metin bilgileriyle birlikte sıralı galeri görsellerini günceller.
    /// </summary>
    Task<ListingResponseDto?> UpdateListingWithImagesAsync(int id, UpdateListingWithImagesDto dto, int callerId, IReadOnlyList<string> imageUrls);

    /// <summary>
    /// İlanı siler. Yalnızca ilanın sahibi (<paramref name="callerId"/>) işlem yapabilir.
    /// Sahip değilse UnauthorizedAccessException fırlatır.
    /// </summary>
    Task<bool> DeleteListingAsync(int id, int callerId);

    /// <summary>
    /// İlanı satıldı / satışta olarak işaretler.
    /// </summary>
    Task<ListingResponseDto?> MarkListingSoldAsync(int id, bool isSold, int callerId, int? soldToUserId = null);
}
