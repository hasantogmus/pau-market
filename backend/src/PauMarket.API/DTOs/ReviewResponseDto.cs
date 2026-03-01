namespace PauMarket.API.DTOs;

/// <summary>
/// API'den dönen tekil değerlendirme (yorum) modeli.
/// </summary>
public class ReviewResponseDto
{
    public int Id { get; set; }
    public int ReviewerId { get; set; }
    
    /// <summary>Yorumu yapan kişinin adı soyadı gösterim için eklendi.</summary>
    public string ReviewerName { get; set; } = string.Empty;

    public int TargetUserId { get; set; }
    public int? ListingId { get; set; }
    public int Rating { get; set; }
    public string? Comment { get; set; }
    public DateTime CreatedAt { get; set; }
}
