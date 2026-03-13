using System.ComponentModel.DataAnnotations;

namespace PauMarket.API.Models;

/// <summary>
/// PAÜ öğrencisini temsil eden kullanıcı modeli.
/// Kayıt zorunluluğu: @posta.pau.edu.tr uzantılı e-posta (Data Annotation ile kısıtlı).
/// </summary>
public class User
{
    public int Id { get; set; }

    [Required(ErrorMessage = "Ad zorunludur.")]
    [MaxLength(50)]
    public required string FirstName { get; set; }

    [Required(ErrorMessage = "Soyad zorunludur.")]
    [MaxLength(50)]
    public required string LastName { get; set; }

    /// <summary>
    /// Sadece @posta.pau.edu.tr uzantılı e-postalar kabul edilir.
    /// Regex: herhangi bir karakter + @posta.pau.edu.tr
    /// </summary>
    [Required(ErrorMessage = "E-posta zorunludur.")]
    [MaxLength(100)]
    [RegularExpression(
        @"^[a-zA-Z0-9._%+\-]+@posta\.pau\.edu\.tr$",
        ErrorMessage = "Sadece '@posta.pau.edu.tr' uzantılı kurumsal e-posta adresi kabul edilir.")]
    public required string Email { get; set; }

    /// <summary>Örn: Bilgisayar Mühendisliği — Öneri sistemi için kullanılır.</summary>
    [MaxLength(100)]
    public string? Department { get; set; }

    /// <summary>1–4 arası sınıf bilgisi — soğuk başlangıç senaryosunda demografik veri olarak kullanılır.</summary>
    [Range(1, 4, ErrorMessage = "Sınıf 1 ile 4 arasında olmalıdır.")]
    public int? Grade { get; set; }

    /// <summary>Kullanıcının tercih ettiği soğuk başlangıç kategorileri (Örn: "Elektronik,Kitap")</summary>
    [MaxLength(200)]
    public string? PreferredCategories { get; set; }

    /// <summary>İkinci elde tercih edilen ürün durumu (Örn: "Yeni,Az Kullanılmış")</summary>
    [MaxLength(100)]
    public string? PreferredCondition { get; set; }

    /// <summary>BCrypt ile hashlenmiş şifre. AuthService tarafından yönetilir.</summary>
    public string PasswordHash { get; set; } = string.Empty;

    /// <summary>Kullanıcının e-posta adresi doğrulandı mı? Varsayılan: false.</summary>
    public bool IsEmailVerified { get; set; } = false;

    /// <summary>
    /// E-posta doğrulama için üretilen 6 haneli kod.
    /// Doğrulama tamamlandığında null'a çekilir.
    /// </summary>
    public string? EmailVerificationToken { get; set; }

    /// <summary>Kullanıcının rolü. Varsayılan: "User". Adminler için "Admin" atanır.</summary>
    [MaxLength(20)]
    public string Role { get; set; } = "User";

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation properties
    public ICollection<Listing> Listings { get; set; } = [];
    public ICollection<Interaction> Interactions { get; set; } = [];
}
