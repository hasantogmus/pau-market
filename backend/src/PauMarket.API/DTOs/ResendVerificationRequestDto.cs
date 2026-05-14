using System.ComponentModel.DataAnnotations;

namespace PauMarket.API.DTOs;

public class ResendVerificationRequestDto
{
    [Required(ErrorMessage = "E-posta zorunludur.")]
    [EmailAddress(ErrorMessage = "Geçerli bir e-posta adresi girin.")]
    public required string Email { get; set; }
}
