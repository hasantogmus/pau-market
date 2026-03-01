using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace PauMarket.API.Controllers;

/// <summary>
/// Yalnızca Admin rolündeki kullanıcıların erişebildiği endpoint'ler.
/// </summary>
[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "Admin")]
public class AdminController : ControllerBase
{
    /// <summary>
    /// Admin kontrol paneli istatistikleri — yalnızca Admin rolü erişebilir.
    /// </summary>
    [HttpGet("dashboard-stats")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public IActionResult GetDashboardStats()
    {
        return Ok(new { message = "Sadece adminler görebilir." });
    }
}
