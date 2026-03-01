using Microsoft.EntityFrameworkCore;
using PauMarket.API.Data;
using PauMarket.API.DTOs;
using PauMarket.API.Models;

namespace PauMarket.API.Services;

public class DashboardService(PauMarketDbContext db) : IDashboardService
{
    public async Task<DashboardSummaryDto> GetUserDashboardAsync(int userId)
    {
        // 1. Kullanıcının aktif ilanlarının sayısı
        int totalActiveListings = await db.Listings
            .CountAsync(l => l.UserId == userId && l.IsActive);

        // 2. Kullanıcının ilanlarına yapılan toplam tıklama/görüntüleme
        int totalViews = await db.UserViews
            .CountAsync(v => v.Listing.UserId == userId);

        // 3. Kullanıcının ilanlarına yapılan favoriye ekleme işlemleri
        int totalFavorites = await db.Interactions
            .CountAsync(i => i.Listing.UserId == userId && i.InteractionType == InteractionType.Favorite);

        // 4. Kullanıcının aldığı yorumların ortalaması ve toplam adedi
        var reviewStats = await db.Reviews
            .Where(r => r.TargetUserId == userId)
            .GroupBy(r => r.TargetUserId)
            .Select(g => new 
            { 
                Total = g.Count(), 
                Average = g.Average(x => (double)x.Rating) 
            })
            .FirstOrDefaultAsync();

        return new DashboardSummaryDto
        {
            TotalActiveListings = totalActiveListings,
            TotalViews          = totalViews,
            TotalFavorites      = totalFavorites,
            TotalReviews        = reviewStats?.Total ?? 0,
            AverageRating       = reviewStats != null ? Math.Round(reviewStats.Average, 1) : 0
        };
    }
}
