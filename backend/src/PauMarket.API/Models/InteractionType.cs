namespace PauMarket.API.Models;

/// <summary>
/// Recommender Sistem için kullanıcı-ilan etkileşim türleri.
/// Rating ağırlıkları: View=1, Favorite=3, Purchase=5
/// </summary>
public enum InteractionType
{
    View = 1,
    Favorite = 3,
    Purchase = 5
}
