using PauMarket.API.DTOs;

namespace PauMarket.API.Services;

public interface IListingService
{
    // ── Herkese açık ──────────────────────────────────────────────────────────
    Task<IEnumerable<ListingResponseDto>> GetAllListingsAsync();
    Task<ListingResponseDto?> GetListingByIdAsync(int id);

    // ── Kimlik doğrulaması ve Yetki gerekli ────────────────────────────────────

    /// <summary>
    /// Yeni ilan oluşturur. 
    /// <paramref name="callerId"/> token'dan alınan kullanıcı ID'sidir.
    /// <paramref name="imageUrl"/> Berke'nin sisteminden gelen fotoğraf adresidir.
    /// </summary>
    Task<ListingResponseDto> CreateListingAsync(CreateListingDto dto, int callerId, string imageUrl);

    /// <summary>
    /// İlanı günceller. Yalnızca ilanın sahibi (<paramref name="callerId"/>) işlem yapabilir.
    /// Sahip değilse UnauthorizedAccessException fırlatır.
    /// </summary>
    Task<ListingResponseDto?> UpdateListingAsync(int id, UpdateListingDto dto, int callerId);

    /// <summary>
    /// İlanı siler. Yalnızca ilanın sahibi (<paramref name="callerId"/>) işlem yapabilir.
    /// Sahip değilse UnauthorizedAccessException fırlatır.
    /// </summary>
    Task<bool> DeleteListingAsync(int id, int callerId);
}