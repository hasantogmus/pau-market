using Microsoft.AspNetCore.Mvc;
using PauMarket.API.DTOs;
using PauMarket.API.Services;

namespace PauMarket.API.Controllers;

/// <summary>
/// Kullanıcı kayıt, giriş ve e-posta doğrulama işlemlerini yöneten controller.
/// </summary>
[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly IAuthService _authService;

    public AuthController(IAuthService authService)
    {
        _authService = authService;
    }

    /// <summary>
    /// Yeni kullanıcı kaydeder.
    /// E-posta ^[a-z]+\d{2}@posta\.pau\.edu\.tr$ formatına uymalıdır (örn: htogmus21@posta.pau.edu.tr).
    /// Kayıt başarılıysa konsola 6 haneli doğrulama kodu yazılır (e-posta simülasyonu).
    /// </summary>
    [HttpPost("register")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> Register([FromBody] RegisterDto dto)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        try
        {
            var message = await _authService.RegisterAsync(dto);
            return Ok(new { message });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    /// <summary>
    /// Kullanıcı girişini doğrular ve başarı durumunda JWT token döner.
    /// E-posta henüz doğrulanmadıysa 403 Forbidden döner.
    /// </summary>
    [HttpPost("login")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> Login([FromBody] LoginDto dto)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        try
        {
            var token = await _authService.LoginAsync(dto);

            if (token is null)
                return Unauthorized(new { error = "E-posta veya şifre hatalı." });

            return Ok(new { token });
        }
        catch (InvalidOperationException ex)
        {
            // E-posta doğrulanmamış — 403 Forbidden ile hata mesajını döndür
            return StatusCode(StatusCodes.Status403Forbidden, new { error = ex.Message });
        }
    }

    /// <summary>
    /// Kayıt sonrası gönderilen 6 haneli kodu doğrular ve hesabı aktif eder.
    /// </summary>
    /// <param name="email">Doğrulanacak e-posta adresi</param>
    /// <param name="token">6 haneli doğrulama kodu</param>
    [HttpPost("verify-email")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> VerifyEmail([FromQuery] string email, [FromQuery] string token)
    {
        if (string.IsNullOrWhiteSpace(email) || string.IsNullOrWhiteSpace(token))
            return BadRequest(new { error = "E-posta ve doğrulama kodu zorunludur." });

        try
        {
            var message = await _authService.VerifyEmailAsync(email, token);
            return Ok(new { message });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }
}
