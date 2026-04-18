using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace PauMarket.API.Models;

public class DealRequest
{
    public int Id { get; set; }

    public int ListingId { get; set; }

    public int BuyerId { get; set; }

    public int SellerId { get; set; }

    [MaxLength(500)]
    public string? Note { get; set; }

    public DealRequestStatus Status { get; set; } = DealRequestStatus.Pending;

    public DateTime RequestedAt { get; set; } = DateTime.UtcNow;

    public DateTime? RespondedAt { get; set; }

    [ForeignKey(nameof(ListingId))]
    public Listing Listing { get; set; } = null!;

    [ForeignKey(nameof(BuyerId))]
    public User Buyer { get; set; } = null!;

    [ForeignKey(nameof(SellerId))]
    public User Seller { get; set; } = null!;
}
