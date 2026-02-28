using Microsoft.AspNetCore.Mvc;
using PauMarket.API.DTOs;
using PauMarket.API.Services;

namespace PauMarket.API.Controllers;

/// <summary>
/// Kullanıcı kayıt ve giriş işlemlerini yöneten controller.
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
    /// </summary>
    /// <param name="dto">Kayıt bilgileri</param>
    /// <returns>200 OK veya 400 Bad Request</returns>
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
    /// </summary>
    /// <param name="dto">Giriş bilgileri</param>
    /// <returns>200 OK + token veya 401 Unauthorized</returns>
    [HttpPost("login")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> Login([FromBody] LoginDto dto)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        var token = await _authService.LoginAsync(dto);

        if (token is null)
            return Unauthorized(new { error = "E-posta veya şifre hatalı." });

        return Ok(new { token });
    }
}
