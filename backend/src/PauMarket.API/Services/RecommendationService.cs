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
public class RecommendationService(
    PauMarketDbContext db,
    HttpClient httpClient,
    IConfiguration configuration) : IRecommendationService
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
            // URL'yi appsettings'den veya Docker ENV vars'dan al (Yoksa varsayılan Docker hostu veya localhost'u dene)
            var recommenderUrl = configuration["RecommenderApiUrl"] ?? "http://recommender:8000";
            var response = await httpClient.GetAsync($"{recommenderUrl}/recommend/by-user-id/{userId}?n={count * 2}");
            
            if (response.IsSuccessStatusCode)
            {
                var content = await response.Content.ReadAsStringAsync();
                var aiData = JsonSerializer.Deserialize<AiRecommendationResponseDto>(content);
                
                if (aiData?.Recommendations != null && aiData.Recommendations.Count > 0)
                {
                    // Canlı akışta yalnızca gerçekten SQL Listing.Id taşıyan öneriler kullanılmalı.
                    // Cold-start kullanıcılarında recommender bilinçli olarak boş dönüp backend fallback'i tetikler.
                    var pythonItemIds = aiData.Recommendations
                        .Select(r => r.OriginalItemId)
                        .Where(id => id > 0)
                        .Distinct()
                        .ToList();

                    // 2. Python'dan gelen ID'leri SQL DB'den bul ve getir. Kullanıcının KENDİ ilanlarını gösterme.
                    var listings = await db.Listings
                        .Include(l => l.Images)
                        .Where(l => pythonItemIds.Contains(l.Id) && l.IsActive && !l.IsSold && l.UserId != userId)
                        .ToListAsync();

                    // Python'un sıralamasını koru
                    var orderedListings = pythonItemIds
                        .Select(id => listings.FirstOrDefault(l => l.Id == id))
                        .Where(l => l != null)
                        .Take(count)
                        .Select(l => MapToDto(l!, "Geçmiş etkileşimlerine benzeyen ilanlardan biri olduğu için önerildi."))
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
            .Where(l => l.IsActive && !l.IsSold)
            .ToListAsync();

        return recentViews.Select(l => MapToDto(l));
    }

    // ─── Public — Görüntüleme Kaydı ──────────────────────────────────────────

    /// <inheritdoc/>
    public async Task TrackViewAsync(int userId, int listingId)
    {
        var listingOwnerId = await db.Listings
            .Where(listing => listing.Id == listingId)
            .Select(listing => (int?)listing.UserId)
            .FirstOrDefaultAsync();

        if (listingOwnerId is null || listingOwnerId == userId)
            return;

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

        await UpsertInteractionAsync(userId, listingId, InteractionType.View);
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
                .Include(l => l.Images)
                .Where(l => l.IsActive
                         && !l.IsSold
                         && l.UserId != userId
                         && !alreadyIncludedIds.Contains(l.Id)
                         && rawCategories.Contains(l.Category))
                .OrderByDescending(l => l.CreatedAt)
                .Take(count)
                .ToListAsync();

            personalizedListings.AddRange(preferredListings.Select(l =>
                MapToDto(l, "Tercih ettiğin kategorilerle eşleştiği için önerildi.")));
        }

        // 3. Kategori yetmezse aynı bölüm/sınıf gibi güven sinyallerini kullan.
        if (personalizedListings.Count < count && user is not null)
        {
            int remaining = count - personalizedListings.Count;
            var excluded = alreadyIncludedIds.Union(personalizedListings.Select(l => l.Id)).ToHashSet();
            var hasDepartment = !string.IsNullOrWhiteSpace(user.Department);
            var hasGrade = user.Grade is not null;

            if (hasDepartment || hasGrade)
            {
                var trustListings = await db.Listings
                    .Include(l => l.User)
                    .Include(l => l.Images)
                    .Where(l => l.IsActive
                             && !l.IsSold
                             && l.UserId != userId
                             && !excluded.Contains(l.Id)
                             && ((hasDepartment && l.User.Department == user.Department)
                                 || (hasGrade && l.User.Grade == user.Grade)))
                    .OrderByDescending(l => l.CreatedAt)
                    .Take(remaining)
                    .ToListAsync();

                personalizedListings.AddRange(trustListings.Select(l =>
                    MapToDto(l, "Aynı bölüm veya sınıftaki PAÜ öğrencilerinden geldiği için öne çıkarıldı.")));
            }
        }

        // 4. Eğer hâlâ 5'ten azsa, KALANLARI EN YENİ İLANLARLA DOLDUR
        if (personalizedListings.Count < count)
        {
            int remaining = count - personalizedListings.Count;
            var excluded = alreadyIncludedIds.Union(personalizedListings.Select(l => l.Id)).ToHashSet();

            var generalListings = await db.Listings
                .Include(l => l.Images)
                .Where(l => l.IsActive
                         && !l.IsSold
                         && l.UserId != userId
                         && !excluded.Contains(l.Id))
                .OrderByDescending(l => l.CreatedAt)
                .Take(remaining)
                .ToListAsync();

            personalizedListings.AddRange(generalListings.Select(l =>
                MapToDto(l, "Yeni ve yayında olan ilanlardan biri olduğu için önerildi.")));
        }

        return personalizedListings;
    }

    // ═══════════════════════════════════════════════════════════════════════════
    //  PRIVATE — DTO Mapping
    // ═══════════════════════════════════════════════════════════════════════════

    private static ListingResponseDto MapToDto(Listing listing, string? recommendationReason = null)
    {
        var imageUrls = listing.Images?
            .OrderBy(image => image.SortOrder)
            .Select(image => image.ImageUrl)
            .Where(url => !string.IsNullOrWhiteSpace(url))
            .ToList() ?? [];

        if (imageUrls.Count == 0 && !string.IsNullOrWhiteSpace(listing.ImageUrl))
            imageUrls.Add(listing.ImageUrl);

        return new ListingResponseDto
        {
            Id          = listing.Id,
            UserId      = listing.UserId,
            Title       = listing.Title,
            Description = listing.Description,
            Price       = listing.Price,
            Category    = listing.Category,
            Condition   = listing.Condition,
            ImageUrl    = listing.ImageUrl ?? imageUrls.FirstOrDefault(),
            ImageUrls   = imageUrls,
            IsActive    = listing.IsActive,
            IsSold      = listing.IsSold,
            SoldAt      = listing.SoldAt,
            SoldToUserId = listing.SoldToUserId,
            RecommendationReason = recommendationReason,
            CreatedAt   = listing.CreatedAt
        };
    }

    private async Task UpsertInteractionAsync(int userId, int listingId, InteractionType interactionType)
    {
        var existingInteraction = await db.Interactions.FirstOrDefaultAsync(interaction =>
            interaction.UserId == userId &&
            interaction.ListingId == listingId &&
            interaction.InteractionType == interactionType);

        if (existingInteraction is not null)
        {
            existingInteraction.Timestamp = DateTime.UtcNow;
            return;
        }

        db.Interactions.Add(new Interaction
        {
            UserId = userId,
            ListingId = listingId,
            InteractionType = interactionType,
            Timestamp = DateTime.UtcNow
        });
    }
}
