using Microsoft.EntityFrameworkCore;
using PauMarket.API.Data;
using PauMarket.API.DTOs;
using PauMarket.API.Models;
using System.Net.Http.Json;

namespace PauMarket.API.Services;

/// <summary>
/// Hibrit Öneri Sistemi servisi (Collaborative + Content-Based + Cold Start).
///
/// Algoritma sırası:
///   Adım A — Collaborative Filtering (İşbirlikçi):
///     Önce Python AI API'yi (LightFM) sorgular. Hata alırsa LINQ Fallback'e geçer.
///
///   Adım B — Content-Based (İçerik Tabanlı):
///     Kullanıcının etkileşime girdiği kategorilerden öneri sunar.
///
///   Adım C — Cold Start (Soğuk Başlangıç):
///     Kullanıcı tercihlerine (PreferredCategories) göre en yeni ilanları getirir.
/// </summary>
public class RecommendationService(
    PauMarketDbContext db, 
    IHttpClientFactory httpClientFactory, 
    IConfiguration configuration) : IRecommendationService
{
    // ─── Public — Hibrit Öneri ────────────────────────────────────────────────

    /// <inheritdoc/>
    public async Task<IEnumerable<ListingResponseDto>> GetHybridRecommendationsAsync(int userId, int count = 5)
    {
        var userOwnListingIds = await db.Listings
            .Where(l => l.UserId == userId)
            .Select(l => l.Id)
            .ToListAsync();

        var userFavoriteListingIds = await db.Interactions
            .Where(i => i.UserId == userId && i.InteractionType == InteractionType.Favorite)
            .Select(i => i.ListingId)
            .ToListAsync();

        var excludeIds = userOwnListingIds
            .Union(userFavoriteListingIds)
            .ToHashSet();

        // ── Adım A: Collaborative Filtering (AI + Fallback) ──────────────────
        var collaborativeResults = await GetCollaborativeRecommendationsAsync(
            userId, userFavoriteListingIds, excludeIds, count);

        // ── Adım B: Content-Based ────────────────────────────────────────────
        var contentBasedResults = await GetContentBasedRecommendationsAsync(
            userId, excludeIds, collaborativeResults.Select(l => l.Id).ToHashSet(), count);

        // ── Birleştir ────────────────────────────────────────────────────────
        var combined = collaborativeResults
            .Concat(contentBasedResults)
            .DistinctBy(l => l.Id)
            .ToList();

        // ── Adım C: Cold Start (Eksiği tamamla) ──────────────────────────────
        if (combined.Count < count)
        {
            var existingIds = combined.Select(l => l.Id).ToHashSet();
            var fillers = await GetColdStartRecommendationsAsync(userId, count - combined.Count, existingIds);
            combined.AddRange(fillers);
        }

        // ── Adım D: Trust Network Boost (Bölüm/Sınıf Uyumu) ───────────────────
        combined = await ApplyTrustBoostAsync(userId, combined);

        return combined.Take(count);
    }

    // ─── Public — Son Gezilenler ──────────────────────────────────────────────

    /// <inheritdoc/>
    public async Task<IEnumerable<ListingResponseDto>> GetRecentlyViewedAsync(int userId, int count = 5)
    {
        var recentViews = await db.UserViews
            .Where(v => v.UserId == userId)
            .OrderByDescending(v => v.ViewedAt)
            .Take(count)
            .Include(v => v.Listing)
            .Select(v => v.Listing)
            .ToListAsync();

        return recentViews.Select(l => MapToDto(l));
    }

    // ─── Public — Görüntüleme Kaydı ──────────────────────────────────────────

    /// <inheritdoc/>
    public async Task TrackViewAsync(int userId, int listingId)
    {
        // 1. UserViews (Son İncelediklerin için)
        var existingView = await db.UserViews
            .FirstOrDefaultAsync(v => v.UserId == userId && v.ListingId == listingId);

        if (existingView is not null)
        {
            existingView.ViewedAt = DateTime.UtcNow;
        }
        else
        {
            db.UserViews.Add(new UserView
            {
                UserId    = userId,
                ListingId = listingId,
                ViewedAt  = DateTime.UtcNow
            });
        }

        // 2. Interactions (Model Eğitimi için)
        var existingInteraction = await db.Interactions
            .AnyAsync(i => i.UserId == userId
                        && i.ListingId == listingId
                        && i.InteractionType == InteractionType.View);

        if (!existingInteraction)
        {
            db.Interactions.Add(new Interaction
            {
                UserId          = userId,
                ListingId       = listingId,
                InteractionType = InteractionType.View,
                Timestamp       = DateTime.UtcNow
            });
        }

        await db.SaveChangesAsync();
    }

    // ═══════════════════════════════════════════════════════════════════════════
    //  PRIVATE — Algoritma Adımları & Trust Network
    // ═══════════════════════════════════════════════════════════════════════════

    /// <summary>
    /// Trust Network - Boosting:
    /// Aynı bölüm veya sınıftaki öğrencilerin ilanlarına öncelik puanı verir.
    /// </summary>
    private async Task<List<ListingResponseDto>> ApplyTrustBoostAsync(int userId, List<ListingResponseDto> listings)
    {
        if (listings.Count == 0) return listings;

        // İzleyen kullanıcının bilgilerini al
        var currentUser = await db.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == userId);
        if (currentUser == null) return listings;

        // Satıcıların bilgilerini toplu çek
        var sellerIds = listings.Select(l => l.UserId).Distinct().ToList();
        var sellers = await db.Users.AsNoTracking()
            .Where(u => sellerIds.Contains(u.Id))
            .ToDictionaryAsync(u => u.Id);

        foreach (var listing in listings)
        {
            if (sellers.TryGetValue(listing.UserId, out var seller))
            {
                int boostScore = 0;
                string trustBadge = "";

                // Aynı Bölüm Boost (+2)
                if (!string.IsNullOrEmpty(currentUser.Department) && currentUser.Department == seller.Department)
                {
                    boostScore += 2;
                    trustBadge = $"[Bölümdaş] {seller.Department}";
                }
                
                // Aynı Sınıf Boost (+1)
                if (currentUser.Grade.HasValue && currentUser.Grade == seller.Grade)
                {
                    boostScore += 1;
                    if (string.IsNullOrEmpty(trustBadge))
                        trustBadge = $"[{seller.Grade}. Sınıf Arkadaşı]";
                }

                if (boostScore > 0)
                {
                    // Gerekçeyi güncelle ve skor ata (geçici olarak Price üzerinden değil, harici bir score ile sıralasaydık daha iyi olurdu ama mevcut yapıda listeyi re-order etmek yeterli)
                    listing.RecommendationReason = $"{trustBadge} - {listing.RecommendationReason}";
                    // Sıralama için ListingResponseDto'da gizli bir Tag veya Score alanı olabilirdi. 
                    // Burada listenin sırasını manuel değiştireceğiz (Aşağıda).
                }
                
                listing.Price -= (decimal)0.0001; // Hacky: Küçük bir farkla sıralamayı etkilemek için (isteğe bağlı)
            }
        }

        // Boost puanına göre (veya güncellenmiş reason içerenlere göre) tekrar sırala
        return listings
            .OrderByDescending(l => l.RecommendationReason?.StartsWith("[") ?? false)
            .ThenByDescending(l => l.CreatedAt)
            .ToList();
    }

    private async Task<List<ListingResponseDto>> GetCollaborativeRecommendationsAsync(
        int userId, List<int> userFavoriteListingIds, HashSet<int> excludeIds, int count)
    {
        // ── Adım 1: Python AI API'ye bağlanmayı dene (LightFM) ────────────────
        try
        {
            var aiApiUrl = configuration["AiApiUrl"] ?? "http://localhost:8000";
            var client = httpClientFactory.CreateClient();
            client.Timeout = TimeSpan.FromSeconds(3);

            var response = await client.GetAsync($"{aiApiUrl}/oneri-getir/{userId}");
            
            if (response.IsSuccessStatusCode)
            {
                var aiResult = await response.Content.ReadFromJsonAsync<AiRecommendationResponse>();
                
                if (aiResult != null && aiResult.Durum == "AI_Aktif" && aiResult.OnerilenUrunler.Any())
                {
                    var aiItemIds = aiResult.OnerilenUrunler
                        .Select(x => x.Id)
                        .Where(id => !excludeIds.Contains(id))
                        .Take(count)
                        .ToList();

                    if (aiItemIds.Any())
                    {
                        var listings = await db.Listings
                            .Where(l => aiItemIds.Contains(l.Id) && l.IsActive)
                            .ToListAsync();

                        return listings.Select(l => MapToDto(l, "Sizinle benzer zevklere sahip kullanıcılar bu ilanı beğendi.")).ToList();
                    }
                }
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"AI API hatası: {ex.Message}");
        }

        // ── Adım 2: Fallback — Geleneksel LINQ ──────────────────────────────
        if (userFavoriteListingIds.Count == 0)
            return [];

        var similarUserIds = await db.Interactions
            .Where(i => userFavoriteListingIds.Contains(i.ListingId)
                     && i.InteractionType == InteractionType.Favorite
                     && i.UserId != userId)
            .Select(i => i.UserId)
            .Distinct()
            .ToListAsync();

        if (similarUserIds.Count == 0)
            return [];

        var listingsResult = await db.Interactions
            .Where(i => similarUserIds.Contains(i.UserId)
                     && i.InteractionType == InteractionType.Favorite
                     && !excludeIds.Contains(i.ListingId))
            .GroupBy(i => i.ListingId)
            .OrderByDescending(g => g.Count())
            .Select(g => g.Key)
            .Take(count)
            .ToListAsync();

        var activeListings = await db.Listings
            .Where(l => listingsResult.Contains(l.Id) && l.IsActive)
            .ToListAsync();

        return activeListings.Select(l => MapToDto(l, "Benzer zevklere sahip kullanıcıların popüler tercihleri.")).ToList();
    }

    private async Task<List<ListingResponseDto>> GetContentBasedRecommendationsAsync(
        int userId, HashSet<int> excludeIds, HashSet<int> alreadyRecommendedIds, int count)
    {
        var favoriteCategories = await db.Interactions
            .Where(i => i.UserId == userId && i.InteractionType == InteractionType.Favorite)
            .Include(i => i.Listing)
            .Select(i => new { i.Listing.Category, Weight = 3 })
            .ToListAsync();

        var viewCategories = await db.UserViews
            .Where(v => v.UserId == userId)
            .Include(v => v.Listing)
            .Select(v => new { v.Listing.Category, Weight = 1 })
            .ToListAsync();

        var topCategories = favoriteCategories
            .Concat(viewCategories)
            .GroupBy(c => c.Category)
            .Select(g => new { Category = g.Key, TotalWeight = g.Sum(x => x.Weight) })
            .OrderByDescending(x => x.TotalWeight)
            .Take(2)
            .Select(x => x.Category)
            .ToList();

        if (topCategories.Count == 0)
            return [];

        var allExcluded = excludeIds.Union(alreadyRecommendedIds).ToHashSet();

        var listings = await db.Listings
            .Where(l => l.IsActive
                     && topCategories.Contains(l.Category)
                     && !allExcluded.Contains(l.Id))
            .OrderByDescending(l => l.CreatedAt)
            .Take(count)
            .ToListAsync();

        return listings.Select(l => MapToDto(l, $"İlginizi çeken '{l.Category}' kategorisindeki yeni ilan.")).ToList();
    }

    private async Task<List<ListingResponseDto>> GetColdStartRecommendationsAsync(
        int userId, int count, HashSet<int>? alreadyIncludedIds = null)
    {
        alreadyIncludedIds ??= [];

        var user = await db.Users
            .AsNoTracking()
            .FirstOrDefaultAsync(u => u.Id == userId);

        var preferredCategories = user?.PreferredCategories
            ?.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            ?? [];

        var preferredConditions = user?.PreferredCondition
            ?.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            ?? [];

        var mappedCategories = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        foreach (var cat in preferredCategories)
        {
            switch (NormalizePreferenceValue(cat))
            {
                case "elektronik":
                    mappedCategories.UnionWith(["Electronics", "Computers & Laptops", "Home Audio", "Tablets & E-readers", "Cell phones & accessories", "TV & Video", "Headphones & MP3 Players", "Smart Home & Security", "Video games & consoles", "Cameras & photo"]);
                    break;
                case "ders kitabi":
                    mappedCategories.UnionWith(["Books", "Other Books", "Nonfiction Books", "Fiction Books", "Books and zines", "Reference Books", "Textbooks"]);
                    break;
                case "giyim":
                    mappedCategories.UnionWith(["Men", "Women", "Clothing", "Shoes", "Tops & blouses", "Sweaters", "Jeans", "Pants", "Shorts", "Dresses", "Skirts", "Athletic apparel", "Coats & jackets", "Swimwear", "Underwear", "Accessories", "Jewelry", "Women's accessories", "Men's accessories"]);
                    break;
                case "ev esyasi":
                    mappedCategories.UnionWith(["Furniture", "Housewares", "Kitchen Dining & Bar", "Bedding", "Home appliances", "Home decor", "Living Room Furniture", "Bedroom Furniture", "Kitchen Furniture", "Bathroom Furniture", "Home Office Furniture", "Kitchen & Table Linens"]);
                    break;
                case "not ozet":
                case "not/ozet":
                    mappedCategories.UnionWith(["Notebooks & Writing Pads", "Paper goods", "Folders & Filing", "Paper", "Books", "Office Supplies"]);
                    break;
                case "hobi":
                case "hobi oyun":
                    mappedCategories.UnionWith(["Hobbies", "Collectibles & Hobbies", "Games & Puzzles", "Toys & Games", "Arts & Crafts", "Musical instruments", "Action Figures & Accessories", "Board Games", "Dolls & Accessories", "Remote Control Toys & Vehicles", "Stuffed Animals & Plush"]);
                    break;
                case "spor":
                    mappedCategories.UnionWith(["Sports & Outdoors", "Exercise & Fitness", "Outdoors", "Camping Equipment", "Golf", "Bicycles", "Basketball Equipment", "Football Equipment", "Baseball Equipment", "Sports Trading Cards", "Snowboarding Gear", "Ski Gear"]);
                    break;
                case "muzik aletleri":
                    mappedCategories.UnionWith(["Musical instruments", "Music"]);
                    break;
                case "bisiklet ulasim":
                case "bisiklet/ulasim":
                    mappedCategories.UnionWith(["Bicycles", "Scooters", "Skateboarding", "Outdoors"]);
                    break;
                case "diger":
                    mappedCategories.Add("Other");
                    break;
                default:
                    mappedCategories.Add(cat);
                    break;
            }
        }

        var mappedConditions = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        foreach (var cond in preferredConditions)
        {
            var cleanedCond = cond.Trim();
            if (cleanedCond.Equals("Sıfır", StringComparison.OrdinalIgnoreCase) || 
                cleanedCond.Equals("Yeni", StringComparison.OrdinalIgnoreCase))
            {
                mappedConditions.Add("New");
            }
            else if (cleanedCond.Equals("Az Kullanılmış", StringComparison.OrdinalIgnoreCase) || 
                     cleanedCond.Equals("Yeni Gibi", StringComparison.OrdinalIgnoreCase) ||
                     cleanedCond.Equals("Yeni gibi", StringComparison.OrdinalIgnoreCase))
            {
                mappedConditions.Add("Like new");
            }
            else if (cleanedCond.Equals("Çok Kullanılmış", StringComparison.OrdinalIgnoreCase) || 
                     cleanedCond.Equals("Eski", StringComparison.OrdinalIgnoreCase))
            {
                mappedConditions.UnionWith(["Good", "Fair", "Poor"]);
            }
            else if (!cleanedCond.Equals("Fark Etmez", StringComparison.OrdinalIgnoreCase))
            {
                mappedConditions.Add(cleanedCond);
            }
        }
        var query = db.Listings
            .Where(l => l.IsActive
                     && l.UserId != userId
                     && !alreadyIncludedIds.Contains(l.Id));

        if (mappedCategories.Count > 0)
        {
            // HashSet can't be translated by EF Core stringly if not converted to list/array. Actually List is better for Contains in EF.
            var catList = mappedCategories.ToList();
            query = query.Where(l => catList.Contains(l.Category));
        }

        if (mappedConditions.Count > 0)
        {
            var condList = mappedConditions.ToList();
            query = query.Where(l => condList.Contains(l.Condition));
        }

        var listings = await query
            .OrderByDescending(l => l.CreatedAt)
            .Take(count)
            .ToListAsync();

        var hasExplicitPreferences = mappedCategories.Count > 0 || mappedConditions.Count > 0;
        var results = listings.Select(l => MapToDto(l, 
            mappedCategories.Contains(l.Category) 
                ? $"İlgi alanınız olan '{l.Category}' kategorisinden popüler ürün."
                : "Kampüs genelindeki en yeni ve popüler ürün.")).ToList();

        if (results.Count < count && !hasExplicitPreferences)
        {
            var fillerIds = results.Select(l => l.Id).ToHashSet();
            fillerIds.UnionWith(alreadyIncludedIds);

            var fillers = await db.Listings
                .Where(l => l.IsActive
                         && l.UserId != userId
                         && !fillerIds.Contains(l.Id))
                .OrderByDescending(l => l.CreatedAt)
                .Take(count - results.Count)
                .ToListAsync();

            results.AddRange(fillers.Select(l => MapToDto(l, "Kampüs genelindeki en yeni ve popüler ürün.")));
        }

        return results;
    }

    private static string NormalizePreferenceValue(string value)
    {
        if (string.IsNullOrWhiteSpace(value))
            return string.Empty;

        return value
            .Trim()
            .ToLowerInvariant()
            .Replace('ı', 'i')
            .Replace('İ', 'i')
            .Replace('ş', 's')
            .Replace('Ş', 's')
            .Replace('ğ', 'g')
            .Replace('Ğ', 'g')
            .Replace('ü', 'u')
            .Replace('Ü', 'u')
            .Replace('ö', 'o')
            .Replace('Ö', 'o');
    }

    private static ListingResponseDto MapToDto(Listing listing, string? reason = null) => new()
    {
        Id                   = listing.Id,
        UserId               = listing.UserId,
        Title                = listing.Title,
        Description          = listing.Description,
        Price                = listing.Price,
        Category             = listing.Category,
        Condition            = listing.Condition,
        ImageUrl             = listing.ImageUrl,
        IsActive             = listing.IsActive,
        CreatedAt            = listing.CreatedAt,
        RecommendationReason = reason
    };

    private class AiRecommendationResponse
    {
        public int KullaniciId { get; set; }
        public string Durum { get; set; } = string.Empty;
        public List<AiProductDto> OnerilenUrunler { get; set; } = [];
    }

    private class AiProductDto
    {
        public int Id { get; set; }
    }
}
