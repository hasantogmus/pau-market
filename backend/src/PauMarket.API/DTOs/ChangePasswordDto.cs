using System.ComponentModel.DataAnnotations;

namespace PauMarket.API.DTOs;

public class ChangePasswordDto
{
    [Required(ErrorMessage = "Mevcut şifre zorunludur.")]
    public required string CurrentPassword { get; set; }

    [Required(ErrorMessage = "Yeni şifre zorunludur.")]
    [MinLength(8, ErrorMessage = "Yeni şifre en az 8 karakter olmalıdır.")]
    [MaxLength(100)]
    public required string NewPassword { get; set; }
}
