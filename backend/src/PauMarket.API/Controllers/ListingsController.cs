using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
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
    private const int MaxListingImages = 10;
    private const long MaxListingImageBytes = 10 * 1024 * 1024;
    private const string ExistingImageTokenPrefix = "existing:";
    private const string NewImageTokenPrefix = "new:";

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
        int? callerId = User.GetUserId();
        var listing = await listingService.GetListingByIdAsync(id, callerId);

        if (listing is null)
            return NotFound(new { error = "İlan bulunamadı." });

        // Giriş yapmış kullanıcı ise görüntüleme geçmişine kaydet
        if (callerId is not null)
        {
            await recommendationService.TrackViewAsync(callerId.Value, id);
        }

        return Ok(listing);
    }

    [HttpGet("mine")]
    [Authorize]
    public async Task<ActionResult<IEnumerable<ListingResponseDto>>> GetMine()
    {
        int? callerId = User.GetUserId();
        if (callerId is null)
            return Unauthorized(new { error = "Geçersiz token." });

        var listings = await listingService.GetUserListingsAsync(callerId.Value, callerId.Value);
        return Ok(listings);
    }

    [HttpGet("purchases")]
    [Authorize]
    public async Task<ActionResult<IEnumerable<ListingResponseDto>>> GetPurchases()
    {
        int? callerId = User.GetUserId();
        if (callerId is null)
            return Unauthorized(new { error = "Geçersiz token." });

        var listings = await listingService.GetPurchasedListingsAsync(callerId.Value);
        return Ok(listings);
    }

    [HttpGet("user/{userId:int}")]
    [AllowAnonymous]
    public async Task<ActionResult<IEnumerable<ListingResponseDto>>> GetByUser(int userId)
    {
        int? callerId = User.GetUserId();
        var listings = await listingService.GetUserListingsAsync(userId, callerId);
        return Ok(listings);
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

        // 3. Fotoğrafları buluta yükle. İlk fotoğraf kapak olarak kullanılacak.
        var files = GetUploadedImages(dto);
        if (files.Count == 0)
            return BadRequest(new { message = "En az 1 fotoğraf yüklemelisiniz." });

        if (files.Count > MaxListingImages)
            return BadRequest(new { message = $"En fazla {MaxListingImages} fotoğraf yükleyebilirsiniz." });

        var oversizedFile = files.FirstOrDefault(file => file.Length > MaxListingImageBytes);
        if (oversizedFile is not null)
        {
            return BadRequest(new
            {
                message = $"{oversizedFile.FileName} çok büyük. Her fotoğraf en fazla {FormatFileSize(MaxListingImageBytes)} olabilir."
            });
        }

        var imageUrls = new List<string>();
        try
        {
            foreach (var file in files)
            {
                var imageUrl = await photoService.AddPhotoAsync(file);

                if (string.IsNullOrEmpty(imageUrl))
                    return BadRequest(new { message = "Fotoğraf yüklenemedi." });

                imageUrls.Add(imageUrl);
            }
        }
        catch (Exception ex) when (ex.Message.Contains("file size", StringComparison.OrdinalIgnoreCase))
        {
            return BadRequest(new { message = $"Fotoğraf çok büyük. Her fotoğraf en fazla {FormatFileSize(MaxListingImageBytes)} olabilir." });
        }
        catch (Exception)
        {
            return StatusCode(StatusCodes.Status502BadGateway,
                new { message = "Fotoğraf yükleme servisi şu anda yanıt vermedi. Lütfen birazdan tekrar deneyin." });
        }

        // 4. İlanı hem sahip ID'si hem de sıralı galeri URL'leri ile oluştur.
        var createdListing = await listingService.CreateListingAsync(dto, callerId.Value, imageUrls);
        
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

    [HttpPut("{id}/with-images")]
    [Authorize]
    [Consumes("multipart/form-data")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ListingResponseDto>> UpdateWithImages(int id, [FromForm] UpdateListingWithImagesDto dto)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        int? callerId = User.GetUserId();
        if (callerId is null)
            return Unauthorized(new { error = "Geçersiz token." });

        var listing = await db.Listings
            .Include(item => item.Images)
            .AsNoTracking()
            .FirstOrDefaultAsync(item => item.Id == id);

        if (listing is null)
            return NotFound(new { error = "İlan bulunamadı." });

        if (listing.UserId != callerId)
            return StatusCode(StatusCodes.Status403Forbidden, new { error = "Bu ilanı değiştirmeye yetkiniz yok." });

        if (dto.ImageOrder.Count == 0)
            return BadRequest(new { message = "En az 1 fotoğraf yüklemelisiniz." });

        if (dto.ImageOrder.Count > MaxListingImages)
            return BadRequest(new { message = $"En fazla {MaxListingImages} fotoğraf yükleyebilirsiniz." });

        var newImageCount = dto.ImageOrder.Count(IsNewImageToken);
        if (newImageCount != dto.Images.Count)
            return BadRequest(new { message = "Fotoğraf sırası ile yeni fotoğraf sayısı uyuşmuyor." });

        var oversizedFile = dto.Images.FirstOrDefault(file => file.Length > MaxListingImageBytes);
        if (oversizedFile is not null)
        {
            return BadRequest(new
            {
                message = $"{oversizedFile.FileName} çok büyük. Her fotoğraf en fazla {FormatFileSize(MaxListingImageBytes)} olabilir."
            });
        }

        var existingImageUrls = listing.Images
            .OrderBy(image => image.SortOrder)
            .Select(image => image.ImageUrl)
            .ToHashSet(StringComparer.Ordinal);

        if (existingImageUrls.Count == 0 && !string.IsNullOrWhiteSpace(listing.ImageUrl))
            existingImageUrls.Add(listing.ImageUrl);

        var seenImageTokens = new HashSet<string>(StringComparer.Ordinal);
        foreach (var imageToken in dto.ImageOrder)
        {
            if (!seenImageTokens.Add(imageToken))
                return BadRequest(new { message = "Aynı fotoğraf sıralamada birden fazla kez kullanılamaz." });

            if (IsExistingImageToken(imageToken))
            {
                var imageUrl = imageToken[ExistingImageTokenPrefix.Length..];
                if (!existingImageUrls.Contains(imageUrl))
                    return BadRequest(new { message = "İlan fotoğrafları güncel değil. Lütfen sayfayı yenileyip tekrar deneyin." });

                continue;
            }

            if (!TryGetNewImageIndex(imageToken, out var imageIndex) || imageIndex < 0 || imageIndex >= dto.Images.Count)
                return BadRequest(new { message = "Fotoğraf sırası geçersiz." });
        }

        var uploadedImageUrls = new Dictionary<int, string>();
        try
        {
            for (var i = 0; i < dto.Images.Count; i++)
            {
                var imageUrl = await photoService.AddPhotoAsync(dto.Images[i]);

                if (string.IsNullOrEmpty(imageUrl))
                    return BadRequest(new { message = "Fotoğraf yüklenemedi." });

                uploadedImageUrls[i] = imageUrl;
            }
        }
        catch (Exception ex) when (ex.Message.Contains("file size", StringComparison.OrdinalIgnoreCase))
        {
            return BadRequest(new { message = $"Fotoğraf çok büyük. Her fotoğraf en fazla {FormatFileSize(MaxListingImageBytes)} olabilir." });
        }
        catch (Exception)
        {
            return StatusCode(StatusCodes.Status502BadGateway,
                new { message = "Fotoğraf yükleme servisi şu anda yanıt vermedi. Lütfen birazdan tekrar deneyin." });
        }

        var orderedImageUrls = dto.ImageOrder.Select(imageToken =>
        {
            if (IsExistingImageToken(imageToken))
                return imageToken[ExistingImageTokenPrefix.Length..];

            _ = TryGetNewImageIndex(imageToken, out var imageIndex);
            return uploadedImageUrls[imageIndex];
        }).ToList();

        try
        {
            var updatedListing = await listingService.UpdateListingWithImagesAsync(id, dto, callerId.Value, orderedImageUrls);

            if (updatedListing is null)
                return NotFound(new { error = "İlan bulunamadı." });

            return Ok(updatedListing);
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

    [HttpPatch("{id}/sale-status")]
    [Authorize]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ListingResponseDto>> UpdateSaleStatus(int id, [FromBody] MarkListingSoldDto dto)
    {
        int? callerId = User.GetUserId();
        if (callerId is null)
            return Unauthorized(new { error = "Geçersiz token." });

        try
        {
            var updatedListing = await listingService.MarkListingSoldAsync(id, dto.IsSold, callerId.Value, dto.SoldToUserId);

            if (updatedListing is null)
                return NotFound(new { error = "İlan bulunamadı." });

            return Ok(updatedListing);
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

    private static List<IFormFile> GetUploadedImages(CreateListingDto dto)
    {
        if (dto.Images?.Count > 0)
            return dto.Images;

        return dto.Image is null ? [] : [dto.Image];
    }

    private static bool IsExistingImageToken(string value) =>
        value.StartsWith(ExistingImageTokenPrefix, StringComparison.Ordinal);

    private static bool IsNewImageToken(string value) =>
        value.StartsWith(NewImageTokenPrefix, StringComparison.Ordinal);

    private static bool TryGetNewImageIndex(string value, out int imageIndex)
    {
        imageIndex = -1;
        return IsNewImageToken(value) &&
               int.TryParse(value[NewImageTokenPrefix.Length..], out imageIndex);
    }

    private static string FormatFileSize(long bytes)
    {
        var megabytes = bytes / 1024d / 1024d;
        return $"{megabytes:0.#} MB";
    }
}
