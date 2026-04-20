using System.ComponentModel.DataAnnotations.Schema;

namespace PauMarket.API.Models;

/// <summary>
/// Recommender Sistem için kullanıcı-ilan etkileşim logu.
/// Her kayıt, kullanıcının bir ilanla yaptığı davranışsal sinyali temsil eder.
/// </summary>
public class Interaction
{
    public int Id { get; set; }

    /// <summary>Etkileşimi gerçekleştiren kullanıcı (Foreign Key).</summary>
    public int UserId { get; set; }

    /// <summary>Etkileşimin gerçekleştirildiği ilan (Foreign Key).</summary>
    public int ListingId { get; set; }

    /// <summary>
    /// Etkileşim türü (Enum):
    ///   View         — ilan görüntüleme
    ///   Message      — satıcıyla mesajlaşma
    ///   Favorite     — ilanı favorileme
    ///   DealRequest  — anlaşma isteği gönderme
    ///   DealAccepted — anlaşma isteğinin kabul edilmesi
    ///   Purchase     — satışın tamamlanması
    /// </summary>
    public InteractionType InteractionType { get; set; }

    public DateTime Timestamp { get; set; } = DateTime.UtcNow;

    // Navigation properties
    [ForeignKey(nameof(UserId))]
    public User User { get; set; } = null!;

    [ForeignKey(nameof(ListingId))]
    public Listing Listing { get; set; } = null!;
}
