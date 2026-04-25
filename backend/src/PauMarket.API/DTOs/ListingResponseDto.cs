namespace PauMarket.API.DTOs;

public class ListingResponseDto
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public string? SellerName { get; set; }
    public int? AcceptedBuyerId { get; set; }
    public string? AcceptedBuyerName { get; set; }
    public string Title { get; set; } = null!;
    public string? Description { get; set; }
    public decimal Price { get; set; }
    public string Category { get; set; } = null!;
    public string CategoryName => Category;
    public string Condition { get; set; } = null!;
    public string? ImageUrl { get; set; }
    public List<string> ImageUrls { get; set; } = [];
    public bool IsActive { get; set; }
    public bool IsSold { get; set; }
    public bool IsApproved { get; set; }
    public int ModerationStatus { get; set; }
    public string ModerationStatusName { get; set; } = "Pending";
    public string? ModerationReason { get; set; }
    public DateTime? SoldAt { get; set; }
    public int? SoldToUserId { get; set; }
    public string? SoldToUserName { get; set; }
    public string? RecommendationReason { get; set; }
    public DateTime CreatedAt { get; set; }
}
