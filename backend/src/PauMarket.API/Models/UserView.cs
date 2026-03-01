using System.ComponentModel.DataAnnotations.Schema;

namespace PauMarket.API.Models;

/// <summary>
/// Kullanıcı–ilan görüntüleme geçmişi.
/// Her kullanıcı–ilan çifti için tek kayıt tutulur; tekrar ziyarette ViewedAt güncellenir.
/// Recommender System'in "Son Gezilenler" ve View-Based öneri adımında kullanılır.
/// </summary>
public class UserView
{
    public int Id { get; set; }

    /// <summary>İzleyen kullanıcı (Foreign Key).</summary>
    public int UserId { get; set; }

    /// <summary>İzlenen ilan (Foreign Key).</summary>
    public int ListingId { get; set; }

    /// <summary>
    /// En son görüntüleme zamanı (UTC).
    /// Aynı ilan tekrar ziyaret edildiğinde bu alan güncellenir; yeni satır eklenmez.
    /// </summary>
    public DateTime ViewedAt { get; set; } = DateTime.UtcNow;

    // Navigation properties
    [ForeignKey(nameof(UserId))]
    public User User { get; set; } = null!;

    [ForeignKey(nameof(ListingId))]
    public Listing Listing { get; set; } = null!;
}
