using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PauMarket.API.Data;
using PauMarket.API.DTOs;
using PauMarket.API.Extensions;
using PauMarket.API.Services;

namespace PauMarket.API.Controllers;

/// <summary>
/// İlan (Listing) CRUD işlemleri.
/// GET → herkese açık.
/// POST / PUT / DELETE → JWT ile kimlik doğrulaması zorunlu.
/// POST → e-posta onaylı olmalı.
/// PUT / DELETE → yalnızca ilanın sahibi yapabilir.
/// </summary>
[ApiController]
[Route("api/[controller]")]
public class ListingsController(
    IListingService listingService,
    IPhotoService photoService,
    IRecommendationService recommendationService,
    PauMarketDbContext db) : ControllerBase
{
    // ── Herkese açık ──────────────────────────────────────────────────────────

    [HttpGet]
    [AllowAnonymous]
    public async Task<ActionResult<PagedResult<ListingResponseDto>>> GetAll([FromQuery] ListingQueryParameters parameters)
    {
        var result = await listingService.GetAllListingsAsync(parameters);
        return Ok(result);
    }

    [HttpGet("{id}")]
    [AllowAnonymous]
    public async Task<ActionResult<ListingResponseDto>> GetById(int id)
    {
        var listing = await listingService.GetListingByIdAsync(id);

        if (listing is null)
            return NotFound(new { error = "İlan bulunamadı." });

        // Giriş yapmış kullanıcı ise görüntüleme geçmişine kaydet
        int? callerId = User.GetUserId();
        if (callerId is not null)
        {
            await recommendationService.TrackViewAsync(callerId.Value, id);
        }

        return Ok(listing);
    }

    /// <summary>
    /// Yeni ilan ekler.
    /// Kural: giriş yapan kullanıcının e-postası doğrulanmış olmalı ve fotoğraf yüklenmeli.
    /// </summary>
    [HttpPost]
    [Authorize]
    [ProducesResponseType(StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<ActionResult<ListingResponseDto>> Create([FromForm] CreateListingDto dto)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        // 1. Token'dan kullanıcı ID'sini al (Hasan'ın Güvenlik Katmanı)
        int? callerId = User.GetUserId();
        if (callerId is null)
            return Unauthorized(new { error = "Geçersiz token." });

        // 2. E-posta onay kontrolü (Hasan'ın Güvenlik Katmanı)
        var user = await db.Users.FindAsync(callerId.Value);
        if (user is null)
            return Unauthorized(new { error = "Kullanıcı bulunamadı." });

        if (!user.IsEmailVerified)
            return StatusCode(StatusCodes.Status403Forbidden,
                new { error = "Lütfen önce e-posta adresinizi onaylayın." });

        // 3. Fotoğrafı buluta yükle (Berke'nin Fotoğraf Katmanı)
        var imageUrl = await photoService.AddPhotoAsync(dto.Image);
        
        if (string.IsNullOrEmpty(imageUrl))
            return BadRequest(new { message = "Fotoğraf yüklenemedi." });

        // 4. İlanı hem sahip ID'si hem de resim URL'i ile oluştur (Birleştirilmiş Mantık)
        var createdListing = await listingService.CreateListingAsync(dto, callerId.Value, imageUrl);
        
        return CreatedAtAction(nameof(GetById), new { id = createdListing.Id }, createdListing);
    }

    /// <summary>
    /// Mevcut ilanı günceller.
    /// Kural: yalnızca ilanın sahibi güncelleyebilir.
    /// </summary>
    [HttpPut("{id}")]
    [Authorize]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ListingResponseDto>> Update(int id, [FromBody] UpdateListingDto dto)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        int? callerId = User.GetUserId();
        if (callerId is null)
            return Unauthorized(new { error = "Geçersiz token." });

        try
        {
            // Sahiplik kontrolü Service içinde yapılıyor
            var updatedListing = await listingService.UpdateListingAsync(id, dto, callerId.Value);

            if (updatedListing is null)
                return NotFound(new { error = "İlan bulunamadı." });

            return Ok(updatedListing);
        }
        catch (UnauthorizedAccessException ex)
        {
            return StatusCode(StatusCodes.Status403Forbidden, new { error = ex.Message });
        }
    }

    /// <summary>
    /// İlanı siler.
    /// Kural: yalnızca ilanın sahibi silebilir.
    /// </summary>
    [HttpDelete("{id}")]
    [Authorize]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Delete(int id)
    {
        int? callerId = User.GetUserId();
        if (callerId is null)
            return Unauthorized(new { error = "Geçersiz token." });

        try
        {
            // Sahiplik kontrolü Service içinde yapılıyor
            bool result = await listingService.DeleteListingAsync(id, callerId.Value);

            if (!result)
                return NotFound(new { error = "İlan bulunamadı." });

            return NoContent();
        }
        catch (UnauthorizedAccessException ex)
        {
            return StatusCode(StatusCodes.Status403Forbidden, new { error = ex.Message });
        }
    }
}