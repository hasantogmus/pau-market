using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PauMarket.API.DTOs;
using PauMarket.API.Extensions;
using PauMarket.API.Services;

namespace PauMarket.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class DealRequestsController(IDealRequestService dealRequestService) : ControllerBase
{
    [HttpPost]
    public async Task<ActionResult<DealRequestResponseDto>> Create([FromBody] CreateDealRequestDto dto)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        int? callerId = User.GetUserId();
        if (callerId is null)
            return Unauthorized(new { error = "Geçersiz token." });

        try
        {
            var created = await dealRequestService.CreateDealRequestAsync(callerId.Value, dto);
            return Ok(created);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    [HttpGet("listing/{listingId}/mine")]
    public async Task<ActionResult<DealRequestResponseDto?>> GetMineForListing(int listingId)
    {
        int? callerId = User.GetUserId();
        if (callerId is null)
            return Unauthorized(new { error = "Geçersiz token." });

        var request = await dealRequestService.GetMyDealRequestForListingAsync(callerId.Value, listingId);
        return Ok(request);
    }

    [HttpPost("{id}/accept")]
    public async Task<ActionResult<DealRequestResponseDto>> Accept(int id)
    {
        int? callerId = User.GetUserId();
        if (callerId is null)
            return Unauthorized(new { error = "Geçersiz token." });

        try
        {
            var result = await dealRequestService.AcceptDealRequestAsync(id, callerId.Value);
            return Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
        catch (UnauthorizedAccessException ex)
        {
            return StatusCode(StatusCodes.Status403Forbidden, new { error = ex.Message });
        }
    }

    [HttpPost("{id}/reject")]
    public async Task<ActionResult<DealRequestResponseDto>> Reject(int id)
    {
        int? callerId = User.GetUserId();
        if (callerId is null)
            return Unauthorized(new { error = "Geçersiz token." });

        try
        {
            var result = await dealRequestService.RejectDealRequestAsync(id, callerId.Value);
            return Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
        catch (UnauthorizedAccessException ex)
        {
            return StatusCode(StatusCodes.Status403Forbidden, new { error = ex.Message });
        }
    }

    [HttpPost("{id}/withdraw")]
    public async Task<ActionResult<DealRequestResponseDto>> Withdraw(int id)
    {
        int? callerId = User.GetUserId();
        if (callerId is null)
            return Unauthorized(new { error = "Geçersiz token." });

        try
        {
            var result = await dealRequestService.WithdrawDealRequestAsync(id, callerId.Value);
            return Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
        catch (UnauthorizedAccessException ex)
        {
            return StatusCode(StatusCodes.Status403Forbidden, new { error = ex.Message });
        }
    }

    [HttpPost("{id}/cancel")]
    public async Task<ActionResult<DealRequestResponseDto>> Cancel(int id)
    {
        int? callerId = User.GetUserId();
        if (callerId is null)
            return Unauthorized(new { error = "Geçersiz token." });

        try
        {
            var result = await dealRequestService.CancelAcceptedDealRequestAsync(id, callerId.Value);
            return Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
        catch (UnauthorizedAccessException ex)
        {
            return StatusCode(StatusCodes.Status403Forbidden, new { error = ex.Message });
        }
    }
}
