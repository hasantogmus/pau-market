namespace PauMarket.API.Models;

/// <summary>
/// Recommender Sistem için kullanıcı-ilan etkileşim türleri.
/// Enum değerleri veritabanında event kodu olarak saklanır.
/// Recommender ağırlıkları için <see cref="InteractionWeights"/> kullanılır.
/// </summary>
public enum InteractionType
{
    View = 1,
    Message = 2,
    Favorite = 3,
    DealRequest = 4,
    Purchase = 5,
    DealAccepted = 6
}

public static class InteractionWeights
{
    public static double ToRecommenderWeight(this InteractionType interactionType) => interactionType switch
    {
        InteractionType.View => 1.0,
        InteractionType.Message => 2.0,
        InteractionType.Favorite => 3.0,
        InteractionType.DealRequest => 4.0,
        InteractionType.DealAccepted => 4.5,
        InteractionType.Purchase => 5.0,
        _ => 1.0
    };
}
