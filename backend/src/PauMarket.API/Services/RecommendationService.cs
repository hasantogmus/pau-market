using Microsoft.EntityFrameworkCore;
using PauMarket.API.Data;
using PauMarket.API.DTOs;
using PauMarket.API.Models;

namespace PauMarket.API.Services;

/// <summary>
/// Hibrit Öneri Sistemi servisi (Collaborative + Content-Based + Cold Start).
///
/// Algoritma sırası:
///   Adım A — Collaborative Filtering (İşbirlikçi):
///     Bu kullanıcının favorilediği ilanları favorileyen diğer kullanıcıları bul.
///     O kullanıcıların favorilediği farklı ilanları öner.
///     ("Bunu beğenenler şunları da beğendi")
///
///   Adım B — Content-Based (İçerik Tabanlı):
///     Bu kullanıcının en çok etkileşime girdiği (Favorites + UserViews) 2 kategoriyi tespit et.
///     Bu kategorilerdeki en yeni/popüler aktif ilanları öner.
///
///   Adım C — Cold Start:
///     Eğer A + B'den hiç sonuç gelmezse en yeni 5 aktif ilanı getir.
///
/// Sonuçlar birleştirilip tekil hale getirilir ve count kadar döner.
/// </summary>
public class RecommendationService(PauMarketDbContext db) : IRecommendationService
{
    // ─── Public — Hibrit Öneri ────────────────────────────────────────────────

    /// <inheritdoc/>
    public async Task<IEnumerable<ListingResponseDto>> GetHybridRecommendationsAsync(int userId, int count = 5)
    {
        // Kullanıcının kendi ilanları ve daha önce favorilediği ilanlar (hariç tutulacak)
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

        // ── Adım A: Collaborative Filtering ──────────────────────────────────
        var collaborativeResults = await GetCollaborativeRecommendationsAsync(
            userId, userFavoriteListingIds, excludeIds, count);

        // ── Adım B: Content-Based ────────────────────────────────────────────
        var contentBasedResults = await GetContentBasedRecommendationsAsync(
            userId, excludeIds, collaborativeResults.Select(l => l.Id).ToHashSet(), count);

        // ── Birleştir ────────────────────────────────────────────────────────
        var combined = collaborativeResults
            .Concat(contentBasedResults)
            .DistinctBy(l => l.Id)
            .Take(count)
            .ToList();

        // ── Adım C: Cold Start ───────────────────────────────────────────────
        if (combined.Count == 0)
        {
            combined = await GetColdStartRecommendationsAsync(userId, count);
        }
        else if (combined.Count < count)
        {
            // A+B az getirdiyse kalan slotları yeni ilanlarla doldur
            var existingIds = combined.Select(l => l.Id).ToHashSet();
            var fillers = await GetColdStartRecommendationsAsync(userId, count - combined.Count, existingIds);
            combined.AddRange(fillers);
        }

        return combined;
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
    //  PRIVATE — Algoritma Adımları
    // ═══════════════════════════════════════════════════════════════════════════

    /// <summary>
    /// Adım A — Collaborative Filtering (İşbirlikçi Filtreleme):
    ///
    /// 1. Bu kullanıcının favorilediği ilanları bul.
    /// 2. Aynı ilanları favorileyen DİĞER kullanıcıları bul.
    /// 3. O kullanıcıların favorilediği, bizim kullanıcının henüz görmediği
    ///    aktif ilanları, favori sayısına göre sıralı getir.
    ///
    /// LINQ eşdeğeri:
    ///   "Bunu beğenenler şunları da beğendi"
    /// </summary>
    private async Task<List<ListingResponseDto>> GetCollaborativeRecommendationsAsync(
        int userId, List<int> userFavoriteListingIds, HashSet<int> excludeIds, int count)
    {
        if (userFavoriteListingIds.Count == 0)
            return [];

        // Adım A.1 — Aynı ilanları favorileyen diğer kullanıcılar
        var similarUserIds = await db.Interactions
            .Where(i => userFavoriteListingIds.Contains(i.ListingId)
                     && i.InteractionType == InteractionType.Favorite
                     && i.UserId != userId)
            .Select(i => i.UserId)
            .Distinct()
            .ToListAsync();

        if (similarUserIds.Count == 0)
            return [];

        // Adım A.2 — O kullanıcıların favorilediği, bizim kullanıcının görmediği ilanlar
        //             Popülerlik sırası: kaç benzer kullanıcı favorilemiş?
        var listings = await db.Interactions
            .Where(i => similarUserIds.Contains(i.UserId)
                     && i.InteractionType == InteractionType.Favorite
                     && !excludeIds.Contains(i.ListingId))
            .GroupBy(i => i.ListingId)
            .OrderByDescending(g => g.Count())     // En popüler → en az popüler
            .Select(g => g.Key)
            .Take(count)
            .ToListAsync();

        // ID'leri listing'lere çevir (aktif olanlara filtrele)
        var activeListings = await db.Listings
            .Where(l => listings.Contains(l.Id) && l.IsActive)
            .ToListAsync();

        return activeListings.Select(MapToDto).ToList();
    }

    /// <summary>
    /// Adım B — Content-Based (İçerik Tabanlı Filtreleme):
    ///
    /// 1. Bu kullanıcının Favorites (Interactions) + UserViews verilerinden
    ///    en çok etkileşime girdiği 2 kategoriyi tespit et.
    /// 2. Bu kategorilerdeki aktif ilanları, en yeni → en eski sırayla getir.
    ///
    /// "İncelediğin kategorilerden öneriler"
    /// </summary>
    private async Task<List<ListingResponseDto>> GetContentBasedRecommendationsAsync(
        int userId, HashSet<int> excludeIds, HashSet<int> alreadyRecommendedIds, int count)
    {
        // B.1 — Favori ilanların kategorileri (ağırlık: 3)
        var favoriteCategories = await db.Interactions
            .Where(i => i.UserId == userId && i.InteractionType == InteractionType.Favorite)
            .Include(i => i.Listing)
            .Select(i => new { i.Listing.Category, Weight = 3 })
            .ToListAsync();

        // B.2 — Görüntüleme geçmişi ilanlarının kategorileri (ağırlık: 1)
        var viewCategories = await db.UserViews
            .Where(v => v.UserId == userId)
            .Include(v => v.Listing)
            .Select(v => new { v.Listing.Category, Weight = 1 })
            .ToListAsync();

        // B.3 — Tüm kategorileri birleştirip ağırlıklı sırala → en çok 2 kategori
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

        // B.4 — Bu kategorilerdeki aktif ilanlardan exclude ve zaten önerilenleri çıkar
        var allExcluded = excludeIds.Union(alreadyRecommendedIds).ToHashSet();

        var listings = await db.Listings
            .Where(l => l.IsActive
                     && topCategories.Contains(l.Category)
                     && !allExcluded.Contains(l.Id))
            .OrderByDescending(l => l.CreatedAt)
            .Take(count)
            .ToListAsync();

        return listings.Select(MapToDto).ToList();
    }

    /// <summary>
    /// Adım C — Cold Start:
    /// Kullanıcının hiç etkileşimi yoksa en yeni aktif ilanları getirir.
    /// Kendi ilanlarını hariç tutar.
    /// </summary>
    private async Task<List<ListingResponseDto>> GetColdStartRecommendationsAsync(
        int userId, int count, HashSet<int>? alreadyIncludedIds = null)
    {
        alreadyIncludedIds ??= [];

        var listings = await db.Listings
            .Where(l => l.IsActive
                     && l.UserId != userId
                     && !alreadyIncludedIds.Contains(l.Id))
            .OrderByDescending(l => l.CreatedAt)
            .Take(count)
            .ToListAsync();

        return listings.Select(MapToDto).ToList();
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
