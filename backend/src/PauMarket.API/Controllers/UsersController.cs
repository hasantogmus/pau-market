using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PauMarket.API.Data;
using PauMarket.API.DTOs;
using PauMarket.API.Extensions;

namespace PauMarket.API.Controllers;

/// <summary>
/// Kullanıcı profili ve tercihlerini yöneten controller.
/// </summary>
[ApiController]
[Route("api/[controller]")]
public class UsersController : ControllerBase
{
    private readonly PauMarketDbContext _db;

    public UsersController(PauMarketDbContext db)
    {
        _db = db;
    }

    /// <summary>
    /// Giriş yapmış kullanıcının onboarding tercihlerini (PreferredCategories, PreferredCondition) günceller.
    /// </summary>
    [HttpPatch("preferences")]
    [Authorize]
    public async Task<IActionResult> UpdatePreferences([FromBody] UpdatePreferencesDto dto)
    {
        var userId = User.GetUserId();
        if (userId is null)
            return Unauthorized(new { error = "Kimlik doğrulaması başarısız." });

        var user = await _db.Users.FirstOrDefaultAsync(u => u.Id == userId);
        if (user is null)
            return NotFound(new { error = "Kullanıcı bulunamadı." });

        user.PreferredCategories = dto.PreferredCategories;
        user.PreferredCondition  = dto.PreferredCondition;

        await _db.SaveChangesAsync();

        return Ok(new { message = "Tercihleriniz başarıyla kaydedildi." });
    }
}
