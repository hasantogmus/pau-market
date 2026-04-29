using System.Text;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PauMarket.API.Services;

namespace PauMarket.API.Controllers;

/// <summary>
/// Recommender training için PAÜ Market verisini CSV olarak dışa aktarır.
/// Yalnızca admin erişimine açıktır.
/// </summary>
[ApiController]
[Route("api/recommender-export")]
[Authorize(Roles = "Admin")]
public class RecommenderExportController(IRecommenderExportService exportService) : ControllerBase
{
    [HttpGet("interactions")]
    [Produces("text/csv")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> ExportInteractions()
    {
        var csv = await exportService.BuildInteractionsCsvAsync();
        return CsvFile(csv, "paumarket_interactions.csv");
    }

    [HttpGet("listings")]
    [Produces("text/csv")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> ExportListings()
    {
        var csv = await exportService.BuildListingsCsvAsync();
        return CsvFile(csv, "paumarket_listings.csv");
    }

    private FileContentResult CsvFile(string csv, string fileName)
    {
        var bytes = Encoding.UTF8.GetBytes(csv);
        return File(bytes, "text/csv; charset=utf-8", fileName);
    }
}
