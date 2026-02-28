using System.ComponentModel.DataAnnotations;

namespace PauMarket.API.DTOs;

public class AddFavoriteDto
{
    [Required(ErrorMessage = "Kullanıcı (UserId) zorunludur.")]
    public int UserId { get; set; }

    [Required(ErrorMessage = "İlan (ListingId) zorunludur.")]
    public int ListingId { get; set; }
}
