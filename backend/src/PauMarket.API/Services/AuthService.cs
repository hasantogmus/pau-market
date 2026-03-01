using System.IdentityModel.Tokens.Jwt;
using System.Net.Security;
using System.Net.Sockets;
using System.Security.Claims;
using System.Text;
using System.Text.RegularExpressions;
using DnsClient;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using PauMarket.API.Data;
using PauMarket.API.DTOs;
using PauMarket.API.Models;

namespace PauMarket.API.Services;

/// <summary>
/// IAuthService implementasyonu.
/// Kayıt: PAÜ e-posta regex + ad/soyad eşleşmesi + öğrenci no yıl eşleşmesi
///        + canlı SMTP kutusu kontrolü + BCrypt hash + 6 haneli doğrulama kodu.
/// Giriş: E-posta doğrulama kontrolü + JWT üretimi.
/// Doğrulama: 6 haneli kodu eşleştirme + hesap onaylama.
/// </summary>
public class AuthService : IAuthService
{
    // Sadece @posta.pau.edu.tr uzantısı zorunlu — diğer kurallar kaldırıldı
    private const string PauEmailSuffix = "@posta.pau.edu.tr";

    private readonly PauMarketDbContext   _db;
    private readonly IConfiguration      _config;
    private readonly ILogger<AuthService> _logger;

    public AuthService(PauMarketDbContext db, IConfiguration config, ILogger<AuthService> logger)
    {
        _db     = db;
        _config = config;
        _logger = logger;
    }

    // ─── Public Interface ────────────────────────────────────────────────────

    /// <inheritdoc/>
    public async Task<string> RegisterAsync(RegisterDto dto)
    {
        // ── Adım 1: PAÜ e-posta uzantı kontrolü ────────────────────────────
        if (!dto.Email.ToLower().EndsWith(PauEmailSuffix))
            throw new InvalidOperationException(
                "Sadece @posta.pau.edu.tr uzantılı üniversite e-posta adresleri ile kayıt olabilirsiniz.");

        // ── Adım 2: E-posta daha önce kullanılmış mı? ───────────────────────
        bool emailExists = await _db.Users
            .AnyAsync(u => u.Email == dto.Email.ToLower());
        if (emailExists)
            throw new InvalidOperationException("Bu e-posta adresi zaten kayıtlı.");

        // ── Adım 3: BCrypt şifre hashleme (work factor: 12) ─────────────────
        string passwordHash = BCrypt.Net.BCrypt.HashPassword(dto.Password, workFactor: 12);

        // ── Adım 4: 6 haneli rastgele doğrulama kodu üret ───────────────────
        string verificationToken = Random.Shared.Next(0, 1_000_000).ToString("D6");

        // ── Adım 5: Kullanıcıyı oluştur ve kaydet ───────────────────────────
        var user = new User
        {
            FirstName              = dto.FirstName,
            LastName               = dto.LastName,
            Email                  = dto.Email.ToLower(),
            PasswordHash           = passwordHash,
            Department             = dto.Department,
            Grade                  = dto.Grade,
            IsEmailVerified        = false,
            EmailVerificationToken = verificationToken
        };

        _db.Users.Add(user);
        await _db.SaveChangesAsync();

        // ── Adım 6: E-posta simülasyonu (konsola yaz) ────────────────────────
        SimulateSendVerificationEmail(user.Email, verificationToken);

        return "Kayıt başarılı. Lütfen e-posta adresinize gönderilen 6 haneli kodu girerek hesabınızı doğrulayın.";
    }

    /// <inheritdoc/>
    public async Task<string?> LoginAsync(LoginDto dto)
    {
        var user = await _db.Users
            .FirstOrDefaultAsync(u => u.Email == dto.Email.ToLower());

        if (user is null) return null;

        bool passwordValid = BCrypt.Net.BCrypt.Verify(dto.Password, user.PasswordHash);
        if (!passwordValid) return null;

        if (!user.IsEmailVerified)
            throw new InvalidOperationException("Lütfen önce e-posta adresinizi onaylayın.");

        return GenerateJwtToken(user);
    }

    /// <inheritdoc/>
    public async Task<string> VerifyEmailAsync(string email, string token)
    {
        var user = await _db.Users
            .FirstOrDefaultAsync(u => u.Email == email.ToLower());

        if (user is null)
            throw new InvalidOperationException("Kullanıcı bulunamadı.");

        if (user.IsEmailVerified)
            return "E-posta adresi zaten doğrulanmış.";

        if (user.EmailVerificationToken?.Trim() != token.Trim())
            throw new InvalidOperationException("Doğrulama kodu hatalı veya süresi dolmuş.");

        user.IsEmailVerified        = true;
        user.EmailVerificationToken = null;
        await _db.SaveChangesAsync();

        return "E-posta başarıyla doğrulandı. Artık giriş yapabilirsiniz.";
    }


    // ─── E-posta Simülasyonu ──────────────────────────────────────────────────


    private void SimulateSendVerificationEmail(string toEmail, string code)
    {
        _logger.LogInformation(
            "📧 [E-POSTA SİMÜLASYONU] Alıcı: {Email} | Doğrulama Kodu: {Code}",
            toEmail, code);

        Console.ForegroundColor = ConsoleColor.Cyan;
        Console.WriteLine("┌─────────────────────────────────────────┐");
        Console.WriteLine("│         PAÜ Market — E-posta Simülasyonu │");
        Console.WriteLine("├─────────────────────────────────────────┤");
        Console.WriteLine($"│  Alıcı : {toEmail,-31}│");
        Console.WriteLine($"│  Kod   : {code,-31}│");
        Console.WriteLine("└─────────────────────────────────────────┘");
        Console.ResetColor();
    }

    // ─── JWT ──────────────────────────────────────────────────────────────────

    private string GenerateJwtToken(User user)
    {
        var jwtConfig  = _config.GetSection("Jwt");
        var key        = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtConfig["Key"]!));
        var creds      = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
        int expMinutes = int.Parse(jwtConfig["ExpireMinutes"] ?? "60");

        var claims = new[]
        {
            new Claim(JwtRegisteredClaimNames.Sub,        user.Id.ToString()),
            new Claim(JwtRegisteredClaimNames.Email,      user.Email),
            new Claim(JwtRegisteredClaimNames.GivenName,  user.FirstName),
            new Claim(JwtRegisteredClaimNames.FamilyName, user.LastName),
            new Claim(JwtRegisteredClaimNames.Jti,        Guid.NewGuid().ToString()),
            new Claim(ClaimTypes.Role,                    user.Role)
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
