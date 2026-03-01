using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PauMarket.API.DTOs;
using PauMarket.API.Extensions;
using PauMarket.API.Services;

namespace PauMarket.API.Controllers;

/// <summary>
/// Satıcı değerlendirme (Puanlama ve Yorum) işlemleri.
/// </summary>
[ApiController]
[Route("api/[controller]")]
public class ReviewsController(IReviewService reviewService) : ControllerBase
{
    /// <summary>
    /// Bir satıcıya yeni bir değerlendirme ve puan ekler.
    /// Satıcı kendisine puan veremez. Aynı ilan için ikinci yorum yapılamaz.
    /// </summary>
    [HttpPost]
    [Authorize]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<ReviewResponseDto>> CreateReview([FromBody] CreateReviewDto dto)
    {
        int? userId = User.GetUserId();
        if (userId is null)
            return Unauthorized(new { error = "Geçersiz token." });

        try
        {
            var result = await reviewService.CreateReviewAsync(userId.Value, dto);
            return Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    /// <summary>
    /// Belirtilen satıcının aldığı tüm yorumları ve hesaplanmış ortalama yıldız puanını getirir.
    /// Herkese açıktır (Giriş yapmadan da yorumlar okunabilir).
    /// </summary>
    /// <param name="userId">Değerlendirmeleri getirilecek satıcının ID'si</param>
    [HttpGet("user/{userId}")]
    [AllowAnonymous]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<ActionResult<UserRatingSummaryDto>> GetUserReviews(int userId)
    {
        var result = await reviewService.GetUserReviewsAsync(userId);
        return Ok(result);
    }
}
