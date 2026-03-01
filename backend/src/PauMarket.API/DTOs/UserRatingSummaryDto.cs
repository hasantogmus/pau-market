namespace PauMarket.API.DTOs;

/// <summary>
/// Bir satıcının tüm yorumlarını ve hesaplanmış profil puanını (ortalama yıldız) tutan özet sınıf.
/// </summary>
public class UserRatingSummaryDto
{
    /// <summary>Kullanıcının ortalama puanı (0.0 ile 5.0 arası).</summary>
    public double AverageRating { get; set; }

    /// <summary>Toplam yapılan yorum sayısı.</summary>
    public int TotalReviews { get; set; }

    /// <summary>Kullanıcıya yapılan tüm yorumların detayı.</summary>
    public IEnumerable<ReviewResponseDto> Reviews { get; set; } = [];
}
