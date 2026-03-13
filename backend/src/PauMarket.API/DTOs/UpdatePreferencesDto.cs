using System.ComponentModel.DataAnnotations;

namespace PauMarket.API.DTOs;

/// <summary>
/// Kullanıcının onboarding sırasında dolduracağı tercih bilgilerini taşır.
/// PreferredCategories: Virgülle ayrılmış kategori listesi (örn: "Elektronik,Kitap")
/// PreferredCondition:  Ürün durumu tercihi (örn: "Yeni,Az Kullanılmış")
/// </summary>
public class UpdatePreferencesDto
{
    [MaxLength(200)]
    public string? PreferredCategories { get; set; }

    [MaxLength(100)]
    public string? PreferredCondition { get; set; }
}
