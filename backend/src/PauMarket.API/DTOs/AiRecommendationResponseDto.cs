using System.Text.Json.Serialization;

namespace PauMarket.API.DTOs;

public class AiRecommendationResponseDto
{
    [JsonPropertyName("user_idx")]
    public int UserIdx { get; set; }

    [JsonPropertyName("recommendations")]
    public List<AiRecommendationItemDto> Recommendations { get; set; } = [];

    [JsonPropertyName("model_used")]
    public string ModelUsed { get; set; } = string.Empty;
}

public class AiRecommendationItemDto
{
    [JsonPropertyName("item_idx")]
    public int ItemIdx { get; set; }

    [JsonPropertyName("original_item_id")]
    public int OriginalItemId { get; set; }

    [JsonPropertyName("score")]
    public float Score { get; set; }
}
