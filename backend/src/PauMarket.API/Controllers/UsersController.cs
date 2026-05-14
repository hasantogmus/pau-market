using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PauMarket.API.Data;
using PauMarket.API.DTOs;
using PauMarket.API.Extensions;
using PauMarket.API.Models;
using PauMarket.API.Services;

namespace PauMarket.API.Controllers;

/// <summary>
/// Kullanıcı profili ve tercihlerini yöneten controller.
/// </summary>
[ApiController]
[Route("api/[controller]")]
public class UsersController : ControllerBase
{
    private readonly PauMarketDbContext _db;
    private readonly IPhotoService _photoService;

    public UsersController(PauMarketDbContext db, IPhotoService photoService)
    {
        _db = db;
        _photoService = photoService;
    }

    /// <summary>
    /// Giriş yapmış kullanıcının profil özetini getirir.
    /// </summary>
    [HttpGet("me")]
    [Authorize]
    public async Task<ActionResult<UserProfileDto>> GetMe()
    {
        var userId = User.GetUserId();
        if (userId is null)
            return Unauthorized(new { error = "Kimlik doğrulaması başarısız." });

        var user = await _db.Users
            .AsNoTracking()
            .FirstOrDefaultAsync(u => u.Id == userId);

        if (user is null)
            return NotFound(new { error = "Kullanıcı bulunamadı." });

        return Ok(MapToProfileDto(user));
    }

    /// <summary>
    /// Herkese açık profil özeti. İsim, bölüm ve sınıf gibi güvenli alanları döner.
    /// </summary>
    [HttpGet("{id:int}/public")]
    [AllowAnonymous]
    public async Task<ActionResult<PublicUserProfileDto>> GetPublicProfile(int id)
    {
        var user = await _db.Users
            .AsNoTracking()
            .FirstOrDefaultAsync(u => u.Id == id);

        if (user is null)
            return NotFound(new { error = "Kullanıcı bulunamadı." });

        return Ok(new PublicUserProfileDto
        {
            Id = user.Id,
            FirstName = user.FirstName,
            LastName = user.LastName,
            Department = user.Department,
            Grade = user.Grade,
            Bio = user.Bio,
            ProfilePhotoUrl = user.ProfilePhotoUrl,
            IsEmailVerified = user.IsEmailVerified,
            CreatedAt = user.CreatedAt
        });
    }

    /// <summary>
    /// Giriş yapmış kullanıcının temel profil bilgilerini günceller.
    /// </summary>
    [HttpPatch("me")]
    [Authorize]
    public async Task<ActionResult<UserProfileDto>> UpdateMe([FromBody] UpdateUserProfileDto dto)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        var userId = User.GetUserId();
        if (userId is null)
            return Unauthorized(new { error = "Kimlik doğrulaması başarısız." });

        var user = await _db.Users.FirstOrDefaultAsync(u => u.Id == userId);
        if (user is null)
            return NotFound(new { error = "Kullanıcı bulunamadı." });

        user.FirstName = dto.FirstName.Trim();
        user.LastName = dto.LastName.Trim();
        user.Department = string.IsNullOrWhiteSpace(dto.Department) ? null : dto.Department.Trim();
        user.Grade = dto.Grade;
        user.PhoneNumber = string.IsNullOrWhiteSpace(dto.PhoneNumber) ? null : dto.PhoneNumber.Trim();
        user.Bio = string.IsNullOrWhiteSpace(dto.Bio) ? null : dto.Bio.Trim();

        await _db.SaveChangesAsync();

        return Ok(MapToProfileDto(user));
    }

    /// <summary>
    /// Giriş yapmış kullanıcının profil fotoğrafını günceller.
    /// </summary>
    [HttpPost("me/photo")]
    [Authorize]
    [Consumes("multipart/form-data")]
    public async Task<ActionResult<UserProfileDto>> UploadProfilePhoto([FromForm] IFormFile file)
    {
        var userId = User.GetUserId();
        if (userId is null)
            return Unauthorized(new { error = "Kimlik doğrulaması başarısız." });

        if (file is null || file.Length == 0)
            return BadRequest(new { error = "Profil fotoğrafı seçilmedi." });

        var user = await _db.Users.FirstOrDefaultAsync(u => u.Id == userId);
        if (user is null)
            return NotFound(new { error = "Kullanıcı bulunamadı." });

        var previousPhotoUrl = user.ProfilePhotoUrl;
        string? uploadedUrl;
        try
        {
            uploadedUrl = await _photoService.AddPhotoAsync(file);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }

        if (string.IsNullOrWhiteSpace(uploadedUrl))
            return BadRequest(new { error = "Profil fotoğrafı yüklenemedi." });

        user.ProfilePhotoUrl = uploadedUrl;
        await _db.SaveChangesAsync();

        if (!string.IsNullOrWhiteSpace(previousPhotoUrl) && !string.Equals(previousPhotoUrl, uploadedUrl, StringComparison.OrdinalIgnoreCase))
            await _photoService.DeletePhotoAsync(previousPhotoUrl);

        return Ok(MapToProfileDto(user));
    }

    /// <summary>
    /// Giriş yapmış kullanıcının şifresini mevcut şifre doğrulamasıyla değiştirir.
    /// </summary>
    [HttpPost("me/change-password")]
    [Authorize]
    public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordDto dto)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        var userId = User.GetUserId();
        if (userId is null)
            return Unauthorized(new { error = "Kimlik doğrulaması başarısız." });

        var user = await _db.Users.FirstOrDefaultAsync(u => u.Id == userId);
        if (user is null)
            return NotFound(new { error = "Kullanıcı bulunamadı." });

        var currentPasswordValid = BCrypt.Net.BCrypt.Verify(dto.CurrentPassword, user.PasswordHash);
        if (!currentPasswordValid)
            return BadRequest(new { error = "Mevcut şifre hatalı." });

        user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.NewPassword, workFactor: 12);
        await _db.SaveChangesAsync();

        return Ok(new { message = "Şifren başarıyla güncellendi." });
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

    private static UserProfileDto MapToProfileDto(User user) => new()
    {
        Id = user.Id,
        FirstName = user.FirstName,
        LastName = user.LastName,
        Email = user.Email,
        Department = user.Department,
        Grade = user.Grade,
        Bio = user.Bio,
        PhoneNumber = user.PhoneNumber,
        ProfilePhotoUrl = user.ProfilePhotoUrl,
        PreferredCategories = user.PreferredCategories,
        PreferredCondition = user.PreferredCondition,
        IsEmailVerified = user.IsEmailVerified,
        Role = user.Role,
        CreatedAt = user.CreatedAt
    };
}
