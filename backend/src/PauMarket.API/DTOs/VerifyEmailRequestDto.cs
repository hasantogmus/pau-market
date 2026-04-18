using System.ComponentModel.DataAnnotations;

namespace PauMarket.API.DTOs;

public class VerifyEmailRequestDto
{
    [Required(ErrorMessage = "E-posta zorunludur.")]
    [EmailAddress(ErrorMessage = "Geçerli bir e-posta adresi girin.")]
    public required string Email { get; set; }

    [Required(ErrorMessage = "Doğrulama kodu zorunludur.")]
    [StringLength(6, MinimumLength = 6, ErrorMessage = "Doğrulama kodu 6 haneli olmalıdır.")]
    public required string Token { get; set; }
}
