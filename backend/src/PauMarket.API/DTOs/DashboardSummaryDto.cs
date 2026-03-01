namespace PauMarket.API.DTOs;

/// <summary>
/// Satıcının performansını özetleyen gösterge paneli (Dashboard) veri modeli.
/// </summary>
public class DashboardSummaryDto
{
    /// <summary>İlana açık (IsActive = true) olan ilanların sayısı.</summary>
    public int TotalActiveListings { get; set; }

    /// <summary>Kullanıcının tüm ilanlarına yapılan toplam tıklama/görüntüleme sayısı.</summary>
    public int TotalViews { get; set; }

    /// <summary>Kullanıcının tüm ilanlarına yapılan toplam favoriye eklenme sayısı.</summary>
    public int TotalFavorites { get; set; }

    /// <summary>Satıcının aldığı yorumların ortalama puanı.</summary>
    public double AverageRating { get; set; }

    /// <summary>Satıcının aldığı toplam değerlendirme/yorum sayısı.</summary>
    public int TotalReviews { get; set; }
}
