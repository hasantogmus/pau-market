using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PauMarket.API.DTOs;
using PauMarket.API.Extensions;
using PauMarket.API.Services;

namespace PauMarket.API.Controllers;

/// <summary>
/// Satıcı gösterge paneli (Dashboard) işlemleri.
/// </summary>
[ApiController]
[Route("api/[controller]")]
[Authorize]
public class DashboardController(IDashboardService dashboardService) : ControllerBase
{
    /// <summary>
    /// Giriş yapan kullanıcının profil performans özetini (aktif ilan sayısı, toplam tıklanma, vb.) getirir.
    /// </summary>
    [HttpGet("me")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<DashboardSummaryDto>> GetMyDashboard()
    {
        int? userId = User.GetUserId();
        if (userId is null)
            return Unauthorized(new { error = "Geçersiz token." });

        var dashboard = await dashboardService.GetUserDashboardAsync(userId.Value);
        return Ok(dashboard);
    }
}
