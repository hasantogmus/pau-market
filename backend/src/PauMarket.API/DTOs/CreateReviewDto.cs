using System.ComponentModel.DataAnnotations;

namespace PauMarket.API.DTOs;

/// <summary>
/// Satıcı için yeni bir değerlendirme oluşturma isteği.
/// </summary>
public class CreateReviewDto
{
    [Required(ErrorMessage = "Değerlendirilecek kullanıcı (TargetUserId) zorunludur.")]
    public required int TargetUserId { get; set; }

    /// <summary>İsteğe bağlı: Hangi ilan referans alınarak yapıldı?</summary>
    public int? ListingId { get; set; }

    [Required(ErrorMessage = "Puan zorunludur.")]
    [Range(1, 5, ErrorMessage = "Puan 1 ile 5 arasında olmalıdır.")]
    public required int Rating { get; set; }

    [MaxLength(1000, ErrorMessage = "Yorum en fazla 1000 karakter olabilir.")]
    public string? Comment { get; set; }
}
