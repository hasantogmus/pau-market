using System.ComponentModel.DataAnnotations;

namespace PauMarket.API.DTOs;

/// <summary>
/// Yeni ilan oluşturma isteği için DTO.
/// UserId artık request body'den alınmıyor — JWT token'dan enjekte ediliyor.
/// Bu, başkası adına ilan açmayı önler.
/// </summary>
public class CreateListingDto
{
    [Required(ErrorMessage = "Başlık zorunludur.")]
    [MaxLength(200)]
    public required string Title { get; set; }

    [MaxLength(2000)]
    public string? Description { get; set; }

    [Required(ErrorMessage = "Fiyat zorunludur.")]
    [Range(0, 999999.99, ErrorMessage = "Fiyat 0 ile 999.999,99 TL arasında olmalıdır.")]
    public decimal Price { get; set; }

    [Required(ErrorMessage = "Kategori zorunludur.")]
    [MaxLength(50)]
    public required string Category { get; set; }

    [Required(ErrorMessage = "Durum zorunludur.")]
    [MaxLength(50)]
    public required string Condition { get; set; }

    [Required(ErrorMessage = "Fotoğraf zorunludur.")]
    public required IFormFile Image { get; set; }
}
