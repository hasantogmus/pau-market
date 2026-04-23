using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace PauMarket.API.Models;

/// <summary>
/// Bir ilanın sıralı galeri görsellerini tutar.
/// İlk sıradaki görsel Listing.ImageUrl alanıyla kapak olarak da senkron kalır.
/// </summary>
public class ListingImage
{
    public int Id { get; set; }

    public int ListingId { get; set; }

    [Required]
    public required string ImageUrl { get; set; }

    public int SortOrder { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [ForeignKey(nameof(ListingId))]
    public Listing Listing { get; set; } = null!;
}
