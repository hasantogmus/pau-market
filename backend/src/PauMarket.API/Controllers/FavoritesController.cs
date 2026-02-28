using Microsoft.AspNetCore.Mvc;
using PauMarket.API.DTOs;
using PauMarket.API.Services;

namespace PauMarket.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class FavoritesController(IInteractionService interactionService) : ControllerBase
{
    [HttpPost]
    public async Task<IActionResult> AddFavorite(AddFavoriteDto dto)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        var result = await interactionService.AddFavoriteAsync(dto);

        if (!result)
            return BadRequest(new { message = "İlan veya kullanıcı bulunamadı, ya da ilan zaten favorilerde." });

        return Ok(new { message = "İlan başarıyla favorilere eklendi." });
    }

    [HttpDelete("{userId}/{listingId}")]
    public async Task<IActionResult> RemoveFavorite(int userId, int listingId)
    {
        var result = await interactionService.RemoveFavoriteAsync(userId, listingId);

        if (!result)
            return NotFound(new { message = "Favori kaydı bulunamadı." });

        return Ok(new { message = "İlan favorilerden çıkarıldı." });
    }

    [HttpGet("{userId}")]
    public async Task<ActionResult<IEnumerable<ListingResponseDto>>> GetUserFavorites(int userId)
    {
        var favorites = await interactionService.GetUserFavoritesAsync(userId);
        return Ok(favorites);
    }
}
