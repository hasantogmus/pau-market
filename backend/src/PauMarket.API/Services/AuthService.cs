using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using System.Text.RegularExpressions;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using PauMarket.API.Data;
using PauMarket.API.DTOs;
using PauMarket.API.Models;

namespace PauMarket.API.Services;

/// <summary>
/// IAuthService implementasyonu.
/// Kayıt: PAÜ e-posta regex doğrulaması + BCrypt şifre hashleme.
/// Giriş: Kimlik doğrulama + JWT üretimi.
/// </summary>
public class AuthService : IAuthService
{
    // Sadece küçük İngilizce harfler + tam olarak 2 rakam + PAÜ domain
    // Geçerli örnek: htogmus21@posta.pau.edu.tr
    private static readonly Regex PauEmailRegex =
        new(@"^[a-z]+\d{2}@posta\.pau\.edu\.tr$", RegexOptions.Compiled);

    private readonly PauMarketDbContext _db;
    private readonly IConfiguration _config;

    public AuthService(PauMarketDbContext db, IConfiguration config)
    {
        _db = db;
        _config = config;
    }

    /// <inheritdoc/>
    public async Task<string> RegisterAsync(RegisterDto dto)
    {
        // 1. PAÜ e-posta formatı kontrolü
        if (!PauEmailRegex.IsMatch(dto.Email))
            throw new InvalidOperationException("Geçersiz okul e-posta formatı");

        // 2. E-posta daha önce kullanılmış mı?
        bool emailExists = await _db.Users
            .AnyAsync(u => u.Email == dto.Email.ToLower());

        if (emailExists)
            throw new InvalidOperationException("Bu e-posta adresi zaten kayıtlı.");

        // 3. Şifreyi BCrypt ile hashle (work factor: 12)
        string passwordHash = BCrypt.Net.BCrypt.HashPassword(dto.Password, workFactor: 12);

        // 4. Kullanıcıyı oluştur ve kaydet
        var user = new User
        {
            FirstName    = dto.FirstName,
            LastName     = dto.LastName,
            Email        = dto.Email.ToLower(),
            PasswordHash = passwordHash,
            Department   = dto.Department,
            Grade        = dto.Grade
        };

        _db.Users.Add(user);
        await _db.SaveChangesAsync();

        return "Kayıt başarılı.";
    }

    /// <inheritdoc/>
    public async Task<string?> LoginAsync(LoginDto dto)
    {
        // 1. Kullanıcıyı e-posta ile bul
        var user = await _db.Users
            .FirstOrDefaultAsync(u => u.Email == dto.Email.ToLower());

        if (user is null)
            return null;

        // 2. BCrypt ile şifre doğrulaması
        bool passwordValid = BCrypt.Net.BCrypt.Verify(dto.Password, user.PasswordHash);
        if (!passwordValid)
            return null;

        // 3. JWT üret
        return GenerateJwtToken(user);
    }

    // ─── Private Helpers ─────────────────────────────────────────────────────

    private string GenerateJwtToken(User user)
    {
        var jwtConfig  = _config.GetSection("Jwt");
        var key        = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtConfig["Key"]!));
        var creds      = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
        int expMinutes = int.Parse(jwtConfig["ExpireMinutes"] ?? "60");

        var claims = new[]
        {
            new Claim(JwtRegisteredClaimNames.Sub,   user.Id.ToString()),
            new Claim(JwtRegisteredClaimNames.Email, user.Email),
            new Claim(JwtRegisteredClaimNames.GivenName, user.FirstName),
            new Claim(JwtRegisteredClaimNames.FamilyName, user.LastName),
            new Claim(JwtRegisteredClaimNames.Jti,   Guid.NewGuid().ToString())
        };

        var token = new JwtSecurityToken(
            issuer:             jwtConfig["Issuer"],
            audience:           jwtConfig["Audience"],
            claims:             claims,
            expires:            DateTime.UtcNow.AddMinutes(expMinutes),
            signingCredentials: creds
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}
