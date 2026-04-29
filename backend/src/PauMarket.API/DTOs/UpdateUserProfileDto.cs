using System.ComponentModel.DataAnnotations;

namespace PauMarket.API.DTOs;

public class UpdateUserProfileDto
{
    [Required(ErrorMessage = "Ad zorunludur.")]
    [MaxLength(50)]
    public required string FirstName { get; set; }

    [Required(ErrorMessage = "Soyad zorunludur.")]
    [MaxLength(50)]
    public required string LastName { get; set; }

    [MaxLength(100)]
    public string? Department { get; set; }

    [Range(1, 4, ErrorMessage = "Sınıf 1 ile 4 arasında olmalıdır.")]
    public int? Grade { get; set; }

    [MaxLength(20)]
    [RegularExpression(@"^[0-9+\-\s()]{7,20}$", ErrorMessage = "Telefon numarası geçerli görünmüyor.")]
    public string? PhoneNumber { get; set; }

    [MaxLength(500)]
    public string? Bio { get; set; }
}
