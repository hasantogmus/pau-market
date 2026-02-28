using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace PauMarket.API.Models;

/// <summary>
/// Platform üzerindeki ikinci el ilan (listing) modelidir.
/// </summary>
public class Listing
{
    public int Id { get; set; }

    /// <summary>İlanı oluşturan kullanıcı (Foreign Key).</summary>
    public int UserId { get; set; }

    [Required(ErrorMessage = "Başlık zorunludur.")]
    [MaxLength(200)]
    public required string Title { get; set; }

    [MaxLength(2000)]
    public string? Description { get; set; }

    [Required(ErrorMessage = "Fiyat zorunludur.")]
    [Range(0, 999999.99, ErrorMessage = "Fiyat 0 ile 999.999,99 TL arasında olmalıdır.")]
    [Column(TypeName = "decimal(18,2)")]
    public decimal Price { get; set; }

    /// <summary>Kategori (Kitap, Elektronik, Mobilya, Kıyafet, Diğer vb.)</summary>
    [Required(ErrorMessage = "Kategori zorunludur.")]
    [MaxLength(50)]
    public required string Category { get; set; }

    /// <summary>Ürün durumu (Sıfır, İkinci El - İyi, İkinci El - Orta, İkinci El - Kötü).</summary>
    [Required(ErrorMessage = "Durum zorunludur.")]
    [MaxLength(50)]
    public required string Condition { get; set; }

    /// <summary>Cloudinary fotoğraf URL'si.</summary>
    public string? ImageUrl { get; set; }

    public bool IsActive { get; set; } = true;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation properties
    [ForeignKey(nameof(UserId))]
    public User User { get; set; } = null!;

    public ICollection<Interaction> Interactions { get; set; } = [];
}
