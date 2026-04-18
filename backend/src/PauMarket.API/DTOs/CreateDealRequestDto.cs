using System.ComponentModel.DataAnnotations;

namespace PauMarket.API.DTOs;

public class CreateDealRequestDto
{
    [Required(ErrorMessage = "İlan bilgisi zorunludur.")]
    public required int ListingId { get; set; }

    [MaxLength(500, ErrorMessage = "Anlaşma notu en fazla 500 karakter olabilir.")]
    public string? Note { get; set; }
}
