using System.ComponentModel.DataAnnotations;

namespace PauMarket.API.DTOs;

public class CreateListingDto
{
    [Required(ErrorMessage = "Satıcı (UserId) zorunludur.")]
    public int UserId { get; set; }

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
}
