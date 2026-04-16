using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using PauMarket.API.Data;
using PauMarket.API.DTOs;
using PauMarket.API.Models;

namespace PauMarket.API.Services;

/// <summary>
/// Hibrit Öneri Sistemi servisi (Collaborative + Content-Based + Cold Start).
/// Python FastAPI servisinden yapay zeka destekli önerileri çeker.
/// Bulunamazsa veritabanından fallback uygular.
/// </summary>
public class RecommendationService(PauMarketDbContext db, HttpClient httpClient) : IRecommendationService
{
    // ─── Public — Hibrit Öneri ────────────────────────────────────────────────

    /// <inheritdoc/>
    public async Task<IEnumerable<ListingResponseDto>> GetHybridRecommendationsAsync(int userId, int count = 5)
    {
        var recommendedListings = new List<ListingResponseDto>();

        try
        {
            // 1. Python Yapay Zeka API'sine istek at
            // Port 8000 varsayılan Python fastapi portu
            var response = await httpClient.GetAsync($"http://127.0.0.1:8000/recommend/{userId}?n={count * 2}");
            
            if (response.IsSuccessStatusCode)
            {
                var content = await response.Content.ReadAsStringAsync();
                var aiData = JsonSerializer.Deserialize<AiRecommendationResponseDto>(content);
                
                if (aiData?.Recommendations != null && aiData.Recommendations.Count > 0)
                {
                    // "original_item_id" Kaggle RetailRocket datasında gerçek İlan ID'si olarak kullanıldı diye varsayıyoruz.
                    // Ya da item_idx python tarafındaki indeks. Gerçek üretim ortamında bunlar SQL DB'deki Id'ler olacak.
                    var pythonItemIds = aiData.Recommendations.Select(r => r.ItemIdx).ToList();

                    // 2. Python'dan gelen ID'leri SQL DB'den bul ve getir. Kullanıcının KENDİ ilanlarını gösterme.
                    var listings = await db.Listings
                        .Where(l => pythonItemIds.Contains(l.Id) && l.IsActive && l.UserId != userId)
                        .ToListAsync();

                    // Python'un sıralamasını koru
                    var orderedListings = pythonItemIds
                        .Select(id => listings.FirstOrDefault(l => l.Id == id))
                        .Where(l => l != null)
                        .Take(count)
                        .Select(MapToDto!)
                        .ToList();

                    recommendedListings.AddRange(orderedListings);
                }
            }
        }
        catch (Exception ex)
        {
            // Python çöktüyse veya çalışmıyorsa hatayı yut, C# fallback algoritmasına düşsün.
            Console.WriteLine($"[RecommendationService] YAPAY ZEKA API HATASI: {ex.Message}");
        }

        // 3. Fallback (B Planı) - Eğer Python boş dönerse veya 5'ten az dönerse, C# Cold Start yedekleri sunar
        if (recommendedListings.Count < count)
        {
            int needed = count - recommendedListings.Count;
            var excludedIds = recommendedListings.Select(l => l.Id).ToHashSet();
            
            var fallback = await GetColdStartRecommendationsAsync(userId, needed, excludedIds);
            recommendedListings.AddRange(fallback);
        }

        return recommendedListings;
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

        return recentViews.Select(MapToDto);
    }

    // ─── Public — Görüntüleme Kaydı ──────────────────────────────────────────

    /// <inheritdoc/>
    public async Task TrackViewAsync(int userId, int listingId)
    {
        var existingView = await db.UserViews
            .FirstOrDefaultAsync(v => v.UserId == userId && v.ListingId == listingId);

        if (existingView is not null)
        {
            // Zaten görüntülenmiş → sadece tarihi güncelle
            existingView.ViewedAt = DateTime.UtcNow;
        }
        else
        {
            // İlk kez görüntüleniyor → yeni kayıt
            db.UserViews.Add(new UserView
            {
                UserId    = userId,
                ListingId = listingId,
                ViewedAt  = DateTime.UtcNow
            });
        }

        await db.SaveChangesAsync();
    }

    // ═══════════════════════════════════════════════════════════════════════════
    //  PRIVATE — Cold Start / Fallback
    // ═══════════════════════════════════════════════════════════════════════════

    /// <summary>
    /// Eğer yapay zeka servisi çökükse veya hiç veri getiremezse 
    /// en yeni ilanları Fallback olarak gösterir ki UI patlamasın.
    /// </summary>
    private async Task<List<ListingResponseDto>> GetColdStartRecommendationsAsync(
        int userId, int count, HashSet<int>? alreadyIncludedIds = null)
    {
        alreadyIncludedIds ??= [];

        // 1. Kullanıcının Ankette Seçtiği Tercihleri Çek
        var user = await db.Users.FirstOrDefaultAsync(u => u.Id == userId);
        
        string rawCategories = user?.PreferredCategories ?? string.Empty;
        var preferredCategories = string.IsNullOrWhiteSpace(rawCategories)
            ? []
            : rawCategories.Split(',', StringSplitOptions.RemoveEmptyEntries).Select(c => c.Trim()).ToList();

        var personalizedListings = new List<ListingResponseDto>();

        // 2. Eğer anket doldurmuşsa (Cold Start tetiklendiğinde) ÖNCE KENDİ SEVDİĞİ KATEGORİLER
        if (preferredCategories.Count > 0)
        {
            // rawCategories string'i içinde içerik araması yaparak esnek bir eşleşme sağlanıyor
            // Örn: l.Category = "Hobi" ise ve rawCategories = "Hobi / Oyun" ise bu eşleşir.
            var preferredListings = await db.Listings
                .Where(l => l.IsActive
                         && l.UserId != userId
                         && !alreadyIncludedIds.Contains(l.Id)
                         && rawCategories.Contains(l.Category))
                .OrderByDescending(l => l.CreatedAt)
                .Take(count)
                .ToListAsync();

            personalizedListings.AddRange(preferredListings.Select(MapToDto));
        }

        // 3. Eğer sevdiği kategoride hiç ilan yoksa veya 5'ten azsa, KALANLARI EN YENİ İLANLARLA DOLDUR
        if (personalizedListings.Count < count)
        {
            int remaining = count - personalizedListings.Count;
            var excluded = alreadyIncludedIds.Union(personalizedListings.Select(l => l.Id)).ToHashSet();

            var generalListings = await db.Listings
                .Where(l => l.IsActive
                         && l.UserId != userId
                         && !excluded.Contains(l.Id))
                .OrderByDescending(l => l.CreatedAt)
                .Take(remaining)
                .ToListAsync();

            personalizedListings.AddRange(generalListings.Select(MapToDto));
        }

        return personalizedListings;
    }

    // ═══════════════════════════════════════════════════════════════════════════
    //  PRIVATE — DTO Mapping
    // ═══════════════════════════════════════════════════════════════════════════

    private static ListingResponseDto MapToDto(Listing listing) => new()
    {
        Id          = listing.Id,
        UserId      = listing.UserId,
        Title       = listing.Title,
        Description = listing.Description,
        Price       = listing.Price,
        Category    = listing.Category,
        Condition   = listing.Condition,
        ImageUrl    = listing.ImageUrl,
        IsActive    = listing.IsActive,
        CreatedAt   = listing.CreatedAt
    };
}
