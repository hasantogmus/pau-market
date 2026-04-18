namespace PauMarket.API.DTOs;

public class MessageThreadDto
{
    public int OtherUserId { get; set; }
    public string OtherUserName { get; set; } = string.Empty;
    public int ListingId { get; set; }
    public string ListingTitle { get; set; } = string.Empty;
    public string? ListingImageUrl { get; set; }
    public string LastMessage { get; set; } = string.Empty;
    public DateTime LastMessageAt { get; set; }
    public bool IsLastMessageMine { get; set; }
    public int UnreadCount { get; set; }
    public bool ListingIsSold { get; set; }
    public int? DealRequestId { get; set; }
    public int? DealRequestStatus { get; set; }
    public string? DealRequestStatusName { get; set; }
    public string? DealRequestNote { get; set; }
    public bool CanRespondToDealRequest { get; set; }
}
