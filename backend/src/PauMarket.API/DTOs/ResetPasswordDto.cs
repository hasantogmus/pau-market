using System.ComponentModel.DataAnnotations;

namespace PauMarket.API.DTOs;

public class ResetPasswordDto
{
    [Required(ErrorMessage = "E-posta zorunludur.")]
    [EmailAddress(ErrorMessage = "Geçerli bir e-posta adresi girin.")]
    public required string Email { get; set; }

    [Required(ErrorMessage = "Şifre sıfırlama kodu zorunludur.")]
    [StringLength(6, MinimumLength = 6, ErrorMessage = "Şifre sıfırlama kodu 6 haneli olmalıdır.")]
    public required string Token { get; set; }

    [Required(ErrorMessage = "Yeni şifre zorunludur.")]
    [MinLength(8, ErrorMessage = "Yeni şifre en az 8 karakter olmalıdır.")]
    [MaxLength(100)]
    public required string NewPassword { get; set; }
}
