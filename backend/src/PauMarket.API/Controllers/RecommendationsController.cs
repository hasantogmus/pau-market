using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PauMarket.API.DTOs;
using PauMarket.API.Extensions;
using PauMarket.API.Services;

namespace PauMarket.API.Controllers;

/// <summary>
/// Hibrit Öneri Sistemi ve Görüntüleme Geçmişi endpoint'leri.
///
/// • GET /api/recommendations/hybrid     → Kullanıcıya özel hibrit öneriler (Collaborative + Content-Based + Cold Start)
/// • GET /api/recommendations/recently-viewed → Kullanıcının son incelediği ilanlar
/// </summary>
[ApiController]
[Route("api/[controller]")]
[Authorize]
public class RecommendationsController(IRecommendationService recommendationService) : ControllerBase
{
    /// <summary>
    /// Hibrit öneri: İşbirlikçi filtreleme + İçerik tabanlı + Cold Start.
    /// </summary>
    /// <param name="count">Getirilecek öneri sayısı (varsayılan: 5)</param>
    [HttpGet("hybrid")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<IEnumerable<ListingResponseDto>>> GetHybridRecommendations(
        [FromQuery] int count = 5)
    {
        int? userId = User.GetUserId();
        if (userId is null)
            return Unauthorized(new { error = "Geçersiz token." });

        var recommendations = await recommendationService
            .GetHybridRecommendationsAsync(userId.Value, count);

        return Ok(recommendations);
    }

    /// <summary>
    /// Kullanıcının en son incelediği ilanlar ("Daha önce incelemiştin" bölümü).
    /// </summary>
    /// <param name="count">Getirilecek ilan sayısı (varsayılan: 5)</param>
    [HttpGet("recently-viewed")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<IEnumerable<ListingResponseDto>>> GetRecentlyViewed(
        [FromQuery] int count = 5)
    {
        int? userId = User.GetUserId();
        if (userId is null)
            return Unauthorized(new { error = "Geçersiz token." });

        var recentlyViewed = await recommendationService
            .GetRecentlyViewedAsync(userId.Value, count);

        return Ok(recentlyViewed);
    }
}
