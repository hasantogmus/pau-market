using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PauMarket.API.DTOs;
using PauMarket.API.Extensions;
using PauMarket.API.Services;

namespace PauMarket.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class FavoritesController(IInteractionService interactionService) : ControllerBase
{
    [HttpPost]
    public async Task<IActionResult> AddFavorite(AddFavoriteDto dto)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        int? userId = User.GetUserId();
        if (userId is null)
            return Unauthorized(new { error = "Geçersiz token." });

        var result = await interactionService.AddFavoriteAsync(userId.Value, dto.ListingId);

        if (!result)
            return BadRequest(new { message = "Bu ilan favorilere eklenemiyor. İlan yayında olmayabilir, satılmış olabilir veya size ait olabilir." });

        return Ok(new { message = "İlan başarıyla favorilere eklendi." });
    }

    [HttpDelete("{listingId:int}")]
    public async Task<IActionResult> RemoveFavorite(int listingId)
    {
        int? userId = User.GetUserId();
        if (userId is null)
            return Unauthorized(new { error = "Geçersiz token." });

        var result = await interactionService.RemoveFavoriteAsync(userId.Value, listingId);

        if (!result)
            return NotFound(new { message = "Favori kaydı bulunamadı." });

        return Ok(new { message = "İlan favorilerden çıkarıldı." });
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<ListingResponseDto>>> GetUserFavorites()
    {
        int? userId = User.GetUserId();
        if (userId is null)
            return Unauthorized(new { error = "Geçersiz token." });

        var favorites = await interactionService.GetUserFavoritesAsync(userId.Value);
        return Ok(favorites);
    }
}
