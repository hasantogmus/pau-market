using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using PauMarket.API.DTOs;
using PauMarket.API.Services;

namespace PauMarket.API.Controllers;

/// <summary>
/// Kullanıcı kayıt, giriş ve e-posta doğrulama işlemlerini yöneten controller.
/// </summary>
[ApiController]
[Route("api/[controller]")]
[EnableRateLimiting("AuthRateLimit")]
public class AuthController : ControllerBase
{
    private readonly IAuthService _authService;
    private readonly IConfiguration _configuration;

    public AuthController(IAuthService authService, IConfiguration configuration)
    {
        _authService = authService;
        _configuration = configuration;
    }

    /// <summary>
    /// Yeni kullanıcı kaydeder ve doğrulama kodu üretir.
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
            return Ok(new
            {
                message,
                expiresInSeconds = GetVerificationCodeLifetimeSeconds()
            });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    /// <summary>
    /// Kullanıcı girişini doğrular ve başarı durumunda JWT token döner.
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
            var code = ex.Message.Contains("doğrulanmadı", StringComparison.OrdinalIgnoreCase)
                ? "EMAIL_NOT_VERIFIED"
                : "LOGIN_BLOCKED";

            return StatusCode(StatusCodes.Status403Forbidden, new { error = ex.Message, code });
        }
    }

    /// <summary>
    /// Kayıt sonrası gönderilen 6 haneli kodu doğrular ve hesabı aktif eder.
    /// </summary>
    [HttpPost("verify-email")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> VerifyEmail([FromBody] VerifyEmailRequestDto dto)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        try
        {
            var message = await _authService.VerifyEmailAsync(dto.Email, dto.Token);
            return Ok(new { message });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    /// <summary>
    /// Kullanıcı için yeni doğrulama kodu üretir ve tekrar gönderir.
    /// </summary>
    [HttpPost("resend-verification")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> ResendVerification([FromBody] ResendVerificationRequestDto dto)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        try
        {
            var message = await _authService.ResendVerificationAsync(dto.Email);
            return Ok(new
            {
                message,
                expiresInSeconds = GetVerificationCodeLifetimeSeconds()
            });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    /// <summary>
    /// Şifresini unutan kullanıcı için süreli sıfırlama kodu gönderir.
    /// </summary>
    [HttpPost("forgot-password")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> ForgotPassword([FromBody] ForgotPasswordRequestDto dto)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        try
        {
            var message = await _authService.RequestPasswordResetAsync(dto);
            return Ok(new
            {
                message,
                expiresInSeconds = GetPasswordResetCodeLifetimeSeconds()
            });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    /// <summary>
    /// Şifre sıfırlama kodunu doğrular ve yeni şifreyi kaydeder.
    /// </summary>
    [HttpPost("reset-password")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> ResetPassword([FromBody] ResetPasswordDto dto)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        try
        {
            var message = await _authService.ResetPasswordAsync(dto);
            return Ok(new { message });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    private int GetVerificationCodeLifetimeSeconds()
    {
        var seconds = _configuration.GetValue<int?>("EmailVerification:CodeLifetimeSeconds") ?? 120;
        return seconds > 0 ? seconds : 120;
    }

    private int GetPasswordResetCodeLifetimeSeconds()
    {
        var seconds = _configuration.GetValue<int?>("PasswordReset:CodeLifetimeSeconds") ?? 600;
        return seconds > 0 ? seconds : 600;
    }
}
