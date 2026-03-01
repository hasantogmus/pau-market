using PauMarket.API.DTOs;

namespace PauMarket.API.Services;

/// <summary>
/// Kullanıcı değerlendirme (Review & Rating) işlemleri servis kontratı.
/// </summary>
public interface IReviewService
{
    /// <summary>
    /// Bir kullanıcıya (satıcıya) yeni bir değerlendirme ve puan ekler.
    /// Kurallar: Kendine puan veremez. Aynı ilandan dolayı aynı kişiye birden fazla yorum yapamaz.
    /// </summary>
    Task<ReviewResponseDto> CreateReviewAsync(int reviewerId, CreateReviewDto dto);

    /// <summary>
    /// Belirtilen satıcının aldığı tüm yorumları ve hesaplanmış ortalama puanını getirir.
    /// </summary>
    Task<UserRatingSummaryDto> GetUserReviewsAsync(int targetUserId);
}
