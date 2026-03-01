using PauMarket.API.DTOs;

namespace PauMarket.API.Services;

/// <summary>
/// Hibrit (Collaborative Filtering + Content-Based) öneri sistemi ve görüntüleme geçmişi servisi.
/// </summary>
public interface IRecommendationService
{
    /// <summary>
    /// Hibrit (3 adımlı) kişiselleştirilmiş öneri algoritması:
    ///   A) Collaborative Filtering → "Bunu beğenenler şunları da beğendi"
    ///   B) Content-Based → en çok etkileşime girilen kategorilerden
    ///   C) Cold Start → A+B sonuç getirmezse en yeni aktif ilanlar
    /// </summary>
    Task<IEnumerable<ListingResponseDto>> GetHybridRecommendationsAsync(int userId, int count = 5);

    /// <summary>
    /// Kullanıcının en son incelediği <paramref name="count"/> ilanı tarihe göre sıralı döner.
    /// </summary>
    Task<IEnumerable<ListingResponseDto>> GetRecentlyViewedAsync(int userId, int count = 5);

    /// <summary>
    /// Kullanıcının bir ilanı görüntülediğini kaydeder.
    /// Aynı kullanıcı–ilan çifti için tekrar çağrıldığında sadece ViewedAt güncellenir.
    /// </summary>
    Task TrackViewAsync(int userId, int listingId);
}
