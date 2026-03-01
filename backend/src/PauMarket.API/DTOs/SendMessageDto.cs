using System.ComponentModel.DataAnnotations;

namespace PauMarket.API.DTOs;

public class SendMessageDto
{
    [Required]
    public int ReceiverId { get; set; }

    [Required]
    public int ListingId { get; set; }

    [Required]
    [MaxLength(2000)]
    public required string Content { get; set; }
}
