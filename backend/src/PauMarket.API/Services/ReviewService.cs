using Microsoft.EntityFrameworkCore;
using PauMarket.API.Data;
using PauMarket.API.DTOs;
using PauMarket.API.Models;

namespace PauMarket.API.Services;

public class ReviewService(PauMarketDbContext db) : IReviewService
{
    public async Task<ReviewResponseDto> CreateReviewAsync(int reviewerId, CreateReviewDto dto)
    {
        // Kural 1: Kendine puan veremez
        if (reviewerId == dto.TargetUserId)
            throw new InvalidOperationException("Kendinize puan ve yorum veremezsiniz.");

        // Hedef kullanıcı (satıcı) mevcut mu kontrolü
        bool targetUserExists = await db.Users.AnyAsync(u => u.Id == dto.TargetUserId);
        if (!targetUserExists)
            throw new InvalidOperationException("Değerlendirilmek istenen satıcı bulunamadı.");

        var listing = await db.Listings
            .AsNoTracking()
            .FirstOrDefaultAsync(item => item.Id == dto.ListingId);

        if (listing is null)
            throw new InvalidOperationException("Değerlendirilecek alışveriş ilanı bulunamadı.");

        if (listing.UserId != dto.TargetUserId)
            throw new InvalidOperationException("Bu ilan seçilen satıcıya ait değil.");

        bool completedPurchase = listing.IsSold &&
                                 (listing.SoldToUserId == reviewerId || await db.Interactions.AnyAsync(interaction =>
                                     interaction.UserId == reviewerId &&
                                     interaction.ListingId == listing.Id &&
                                     interaction.InteractionType == InteractionType.Purchase));

        if (!completedPurchase)
            throw new InvalidOperationException("Satıcıyı değerlendirebilmek için önce bu ilandan alışveriş yapmış olmanız gerekir.");

        // Kural 2: Aynı ilandan dolayı aynı kişiye birden fazla yorum yapılamaz
        bool alreadyReviewed = await db.Reviews.AnyAsync(r =>
            r.ReviewerId == reviewerId &&
            r.TargetUserId == dto.TargetUserId &&
            r.ListingId == dto.ListingId);

        if (alreadyReviewed)
            throw new InvalidOperationException("Bu alışveriş için bu satıcıya zaten bir değerlendirme yaptınız.");

        var review = new Review
        {
            ReviewerId   = reviewerId,
            TargetUserId = dto.TargetUserId,
            ListingId    = dto.ListingId,
            Rating       = dto.Rating,
            Comment      = dto.Comment
        };

        db.Reviews.Add(review);
        await db.SaveChangesAsync();

        // DTO'yu tam dönmek için reviewer adını da çekiyoruz
        var reviewer = await db.Users.FirstAsync(u => u.Id == reviewerId);

        return new ReviewResponseDto
        {
            Id           = review.Id,
            ReviewerId   = review.ReviewerId,
            ReviewerName = $"{reviewer.FirstName} {reviewer.LastName}",
            TargetUserId = review.TargetUserId,
            ListingId    = review.ListingId,
            Rating       = review.Rating,
            Comment      = review.Comment,
            CreatedAt    = review.CreatedAt
        };
    }

    public async Task<UserRatingSummaryDto> GetUserReviewsAsync(int targetUserId)
    {
        var reviews = await db.Reviews
            .Include(r => r.Reviewer)
            .Where(r => r.TargetUserId == targetUserId)
            .OrderByDescending(r => r.CreatedAt)
            .ToListAsync();

        int totalReviews = reviews.Count;
        double averageRating = totalReviews > 0 ? reviews.Average(r => r.Rating) : 0;

        return new UserRatingSummaryDto
        {
            TotalReviews  = totalReviews,
            AverageRating = Math.Round(averageRating, 1), // Örn: 4.5
            Reviews       = reviews.Select(r => new ReviewResponseDto
            {
                Id           = r.Id,
                ReviewerId   = r.ReviewerId,
                ReviewerName = $"{r.Reviewer.FirstName} {r.Reviewer.LastName}",
                TargetUserId = r.TargetUserId,
                ListingId    = r.ListingId,
                Rating       = r.Rating,
                Comment      = r.Comment,
                CreatedAt    = r.CreatedAt
            })
        };
    }
}
