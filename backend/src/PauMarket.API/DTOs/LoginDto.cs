using System.ComponentModel.DataAnnotations;

namespace PauMarket.API.DTOs;

/// <summary>
/// Kullanıcı giriş isteği için veri transfer nesnesi.
/// </summary>
public class LoginDto
{
    [Required(ErrorMessage = "E-posta zorunludur.")]
    public required string Email { get; set; }

    [Required(ErrorMessage = "Şifre zorunludur.")]
    public required string Password { get; set; }
}
