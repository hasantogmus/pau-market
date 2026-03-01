using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace PauMarket.API.Models;

/// <summary>
/// İki kullanıcı arasında ilan üzerinden gönderilen mesajı temsil eder.
/// </summary>
public class Message
{
    public int Id { get; set; }

    /// <summary>Mesajı gönderen kullanıcı (FK).</summary>
    public int SenderId { get; set; }

    /// <summary>Mesajı alan kullanıcı (FK).</summary>
    public int ReceiverId { get; set; }

    /// <summary>Mesajın ilgili olduğu ilan (FK).</summary>
    public int ListingId { get; set; }

    [Required]
    [MaxLength(2000)]
    public required string Content { get; set; }

    /// <summary>Varsayılan olarak okunmamış gelir.</summary>
    public bool IsRead { get; set; } = false;

    public DateTime SentAt { get; set; } = DateTime.UtcNow;

    // ── Navigation Properties ────────────────────────────────────────────────

    [ForeignKey(nameof(SenderId))]
    public User Sender { get; set; } = null!;

    [ForeignKey(nameof(ReceiverId))]
    public User Receiver { get; set; } = null!;

    [ForeignKey(nameof(ListingId))]
    public Listing Listing { get; set; } = null!;
}
