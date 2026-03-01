using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace PauMarket.API.Models;

/// <summary>
/// Kullanıcıların birbirlerini değerlendirmesini tutan model.
/// </summary>
public class Review
{
    public int Id { get; set; }

    /// <summary>Değerlendirmeyi yapan kullanıcı (Foreign Key).</summary>
    public int ReviewerId { get; set; }

    /// <summary>Değerlendirilen satıcı (Foreign Key).</summary>
    public int TargetUserId { get; set; }

    /// <summary>Hangi ilan için değerlendirme yapıldı (Opsiyonel).</summary>
    public int? ListingId { get; set; }

    /// <summary>Verilen puan (1 ile 5 arası).</summary>
    [Range(1, 5, ErrorMessage = "Puan 1 ile 5 arasında olmalıdır.")]
    public int Rating { get; set; }

    /// <summary>Yorum metni.</summary>
    [MaxLength(1000, ErrorMessage = "Yorum en fazla 1000 karakter olabilir.")]
    public string? Comment { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation properties
    [ForeignKey(nameof(ReviewerId))]
    public User Reviewer { get; set; } = null!;

    [ForeignKey(nameof(TargetUserId))]
    public User TargetUser { get; set; } = null!;

    [ForeignKey(nameof(ListingId))]
    public Listing? Listing { get; set; }
}
