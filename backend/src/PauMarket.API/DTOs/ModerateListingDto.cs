using System.ComponentModel.DataAnnotations;

namespace PauMarket.API.DTOs;

public class ModerateListingDto
{
    [MaxLength(500)]
    public string? Reason { get; set; }
}
