using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PauMarket.API.DTOs;
using PauMarket.API.Extensions;
using PauMarket.API.Services;

namespace PauMarket.API.Controllers;

/// <summary>
/// Mesajlaşma işlemleri.
/// Tüm endpoint'ler JWT ile kimlik doğrulaması gerektirir.
/// </summary>
[ApiController]
[Route("api/[controller]")]
[Authorize]
public class MessagesController(IMessageService messageService) : ControllerBase
{
    /// <summary>
    /// Yeni bir mesaj gönderir.
    /// SenderId token'dan otomatik alınır.
    /// </summary>
    [HttpPost]
    [ProducesResponseType(StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<MessageResponseDto>> Send([FromBody] SendMessageDto dto)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        int? senderId = User.GetUserId();
        if (senderId is null)
            return Unauthorized(new { error = "Geçersiz token." });

        var message = await messageService.SendMessageAsync(dto, senderId.Value);
        return CreatedAtAction(nameof(GetConversation),
            new { otherUserId = dto.ReceiverId, listingId = dto.ListingId },
            message);
    }

    /// <summary>
    /// İki kullanıcı arasında belirli bir ilan üzerindeki konuşmayı getirir.
    /// </summary>
    [HttpGet("conversation")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<IEnumerable<MessageResponseDto>>> GetConversation(
        [FromQuery] int otherUserId,
        [FromQuery] int listingId)
    {
        int? currentUserId = User.GetUserId();
        if (currentUserId is null)
            return Unauthorized(new { error = "Geçersiz token." });

        var messages = await messageService.GetConversationAsync(currentUserId.Value, otherUserId, listingId);
        return Ok(messages);
    }

    /// <summary>
    /// Belirtilen mesajı 'okundu' olarak işaretler.
    /// Yalnızca mesajın alıcısı bu işlemi yapabilir.
    /// </summary>
    [HttpPut("{id}/read")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> MarkAsRead(int id)
    {
        int? currentUserId = User.GetUserId();
        if (currentUserId is null)
            return Unauthorized(new { error = "Geçersiz token." });

        try
        {
            bool result = await messageService.MarkAsReadAsync(id, currentUserId.Value);
            if (!result)
                return NotFound(new { error = "Mesaj bulunamadı." });

            return NoContent();
        }
        catch (UnauthorizedAccessException ex)
        {
            return StatusCode(StatusCodes.Status403Forbidden, new { error = ex.Message });
        }
    }
}
