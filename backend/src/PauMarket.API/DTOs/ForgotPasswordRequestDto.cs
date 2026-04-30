using System.ComponentModel.DataAnnotations;

namespace PauMarket.API.DTOs;

public class ForgotPasswordRequestDto
{
    [Required(ErrorMessage = "E-posta zorunludur.")]
    [EmailAddress(ErrorMessage = "Geçerli bir e-posta adresi girin.")]
    public required string Email { get; set; }
}
