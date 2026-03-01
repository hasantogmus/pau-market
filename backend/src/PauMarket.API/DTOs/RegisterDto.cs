using System.ComponentModel.DataAnnotations;

namespace PauMarket.API.DTOs;

/// <summary>
/// Kullanıcı kayıt isteği için veri transfer nesnesi.
/// E-posta @posta.pau.edu.tr uzantısıyla bitmelidir.
/// Öğrenci numarası tam 8 rakamdan oluşmalıdır.
/// </summary>
public class RegisterDto
{
    [Required(ErrorMessage = "Ad zorunludur.")]
    [MaxLength(50)]
    public required string FirstName { get; set; }

    [Required(ErrorMessage = "Soyad zorunludur.")]
    [MaxLength(50)]
    public required string LastName { get; set; }

    /// <summary>
    /// PAÜ okul e-postası: küçük İngilizce harfler + 2 rakam + @posta.pau.edu.tr
    /// Örnek: htogmus21@posta.pau.edu.tr
    /// </summary>
    [Required(ErrorMessage = "E-posta zorunludur.")]
    public required string Email { get; set; }

    [Required(ErrorMessage = "Şifre zorunludur.")]
    [MinLength(6, ErrorMessage = "Şifre en az 6 karakter olmalıdır.")]
    public required string Password { get; set; }

    /// <summary>
    /// PAÜ öğrenci numarası — tam olarak 8 rakam.
    /// </summary>
    [Required(ErrorMessage = "Öğrenci numarası zorunludur.")]
    [RegularExpression(@"^[0-9]{8}$",
        ErrorMessage = "Öğrenci numarası tam 8 haneli olmalıdır.")]
    public required string StudentNumber { get; set; }

    [MaxLength(100)]
    public string? Department { get; set; }

    [Range(1, 4, ErrorMessage = "Sınıf 1 ile 4 arasında olmalıdır.")]
    public int? Grade { get; set; }
}
