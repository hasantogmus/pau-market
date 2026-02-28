using PauMarket.API.DTOs;

namespace PauMarket.API.Services;

public interface IListingService
{
    // ── Herkese açık ──────────────────────────────────────────────────────────
    Task<IEnumerable<ListingResponseDto>> GetAllListingsAsync();
    Task<ListingResponseDto?> GetListingByIdAsync(int id);

    // ── Kimlik doğrulaması gerekli ────────────────────────────────────────────

    /// <summary>
    /// Yeni ilan oluşturur. <paramref name="callerId"/> token'dan alınan kullanıcı ID'sidir.
    /// </summary>
    Task<ListingResponseDto> CreateListingAsync(CreateListingDto dto, int callerId);

    /// <summary>
    /// İlanı günceller. Yalnızca ilanın sahibi (<paramref name="callerId"/>) işlem yapabilir.
    /// Sahip değilse <see cref="UnauthorizedAccessException"/> fırlatır.
    /// </summary>
    Task<ListingResponseDto?> UpdateListingAsync(int id, UpdateListingDto dto, int callerId);

    /// <summary>
    /// İlanı siler. Yalnızca ilanın sahibi (<paramref name="callerId"/>) işlem yapabilir.
    /// Sahip değilse <see cref="UnauthorizedAccessException"/> fırlatır.
    /// </summary>
    Task<bool> DeleteListingAsync(int id, int callerId);
}
