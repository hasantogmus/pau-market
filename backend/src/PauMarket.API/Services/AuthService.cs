using System.IdentityModel.Tokens.Jwt;
using System.Net;
using System.Net.Mail;
using System.Security.Claims;
using System.Text;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using PauMarket.API.Data;
using PauMarket.API.DTOs;
using PauMarket.API.Models;

namespace PauMarket.API.Services;

/// <summary>
/// IAuthService implementasyonu.
/// Okul e-postası doğrulamasını zorunlu kılar; SMTP yapılandırması yoksa geliştirme ortamında kod loglara yazılır.
/// </summary>
public class AuthService : IAuthService
{
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
        var normalizedEmail = dto.Email.Trim().ToLowerInvariant();
        var emailSuffix = GetAllowedEmailSuffix();

        if (!normalizedEmail.EndsWith(emailSuffix, StringComparison.Ordinal))
            throw new InvalidOperationException(
                $"Sadece {emailSuffix} uzantılı üniversite e-posta adresleri ile kayıt olabilirsiniz.");

        var existingUser = await _db.Users
            .FirstOrDefaultAsync(u => u.Email == normalizedEmail);
        if (existingUser is not null)
        {
            if (existingUser.IsEmailVerified)
                throw new InvalidOperationException("Bu e-posta adresi zaten kayıtlı. Lütfen giriş yapın.");

            if (!IsEmailDeliveryConfigured())
                throw new InvalidOperationException("Doğrulama kodu şu anda gönderilemiyor. Lütfen daha sonra tekrar deneyin.");

            var resendToken = GenerateVerificationToken();
            var resendExpiresAt = GetVerificationCodeExpiry();
            await SendVerificationEmailAsync(existingUser.Email, resendToken);
            existingUser.EmailVerificationToken = BuildStoredVerificationToken(resendToken, resendExpiresAt);
            await _db.SaveChangesAsync();

            return "Bu e-posta ile başlatılmış bir kayıt bulundu. Hesabını aktifleştirmek için yeni doğrulama kodu okul e-posta adresine gönderildi.";
        }

        string passwordHash = BCrypt.Net.BCrypt.HashPassword(dto.Password, workFactor: 12);
        string verificationToken = GenerateVerificationToken();
        DateTime verificationExpiresAt = GetVerificationCodeExpiry();
        bool autoVerify = _config.GetValue<bool>("EmailVerification:AutoVerify");

        if (!autoVerify && !IsEmailDeliveryConfigured())
            throw new InvalidOperationException("Doğrulama kodu şu anda gönderilemiyor. Lütfen daha sonra tekrar deneyin.");

        var user = new User
        {
            FirstName              = dto.FirstName,
            LastName               = dto.LastName,
            Email                  = normalizedEmail,
            PasswordHash           = passwordHash,
            Department             = dto.Department,
            Grade                  = dto.Grade,
            IsEmailVerified        = autoVerify,
            EmailVerificationToken = autoVerify ? null : BuildStoredVerificationToken(verificationToken, verificationExpiresAt)
        };

        if (autoVerify)
        {
            _db.Users.Add(user);
            await _db.SaveChangesAsync();
            return "Kayıt başarılı. Bu ortamda e-posta doğrulaması otomatik açık olduğu için giriş yapabilirsiniz.";
        }

        await SendVerificationEmailAsync(user.Email, verificationToken);
        _db.Users.Add(user);
        await _db.SaveChangesAsync();
        return "Kayıt başarılı. Hesabını aktifleştirmek için okul e-posta adresine gönderilen 6 haneli doğrulama kodunu gir.";
    }

    /// <inheritdoc/>
    public async Task<string?> LoginAsync(LoginDto dto)
    {
        var normalizedEmail = dto.Email.Trim().ToLowerInvariant();
        var user = await _db.Users
            .FirstOrDefaultAsync(u => u.Email == normalizedEmail);

        if (user is null) return null;

        bool passwordValid = BCrypt.Net.BCrypt.Verify(dto.Password, user.PasswordHash);
        if (!passwordValid) return null;

        if (!user.IsEmailVerified)
            throw new InvalidOperationException("E-posta adresiniz henüz doğrulanmadı. Lütfen doğrulama kodunu girip hesabınızı aktifleştirin.");

        return GenerateJwtToken(user);
    }

    /// <inheritdoc/>
    public async Task<string> VerifyEmailAsync(string email, string token)
    {
        var user = await _db.Users
            .FirstOrDefaultAsync(u => u.Email == email.Trim().ToLowerInvariant());

        if (user is null)
            throw new InvalidOperationException("Kullanıcı bulunamadı.");

        if (user.IsEmailVerified)
            return "E-posta adresi zaten doğrulanmış.";

        if (!TryParseStoredVerificationToken(user.EmailVerificationToken, out var storedToken, out var expiresAt))
            throw new InvalidOperationException("Doğrulama kodu geçersiz. Lütfen yeni kod isteyin.");

        if (expiresAt < DateTime.UtcNow)
            throw new InvalidOperationException("Doğrulama kodunun süresi doldu. Lütfen yeni kod isteyin.");

        if (!string.Equals(storedToken, token.Trim(), StringComparison.Ordinal))
            throw new InvalidOperationException("Doğrulama kodu hatalı veya süresi dolmuş.");

        user.IsEmailVerified        = true;
        user.EmailVerificationToken = null;
        await _db.SaveChangesAsync();

        return "E-posta başarıyla doğrulandı. Artık giriş yapabilirsiniz.";
    }

    /// <inheritdoc/>
    public async Task<string> ResendVerificationAsync(string email)
    {
        var normalizedEmail = email.Trim().ToLowerInvariant();
        var user = await _db.Users.FirstOrDefaultAsync(u => u.Email == normalizedEmail);

        if (user is null)
            throw new InvalidOperationException("Kullanıcı bulunamadı.");

        if (user.IsEmailVerified)
            return "Bu hesap zaten doğrulanmış durumda. Giriş yapabilirsiniz.";

        var verificationToken = GenerateVerificationToken();
        var verificationExpiresAt = GetVerificationCodeExpiry();
        if (!IsEmailDeliveryConfigured())
            throw new InvalidOperationException("Doğrulama kodu şu anda gönderilemiyor. Lütfen daha sonra tekrar deneyin.");

        await SendVerificationEmailAsync(user.Email, verificationToken);
        user.EmailVerificationToken = BuildStoredVerificationToken(verificationToken, verificationExpiresAt);
        await _db.SaveChangesAsync();

        return "Yeni doğrulama kodu gönderildi. Lütfen okul e-posta kutunu kontrol et.";
    }


    // ─── E-posta Simülasyonu ──────────────────────────────────────────────────


    private string GetAllowedEmailSuffix() =>
        _config["AllowedEmailDomain"]?.Trim().ToLowerInvariant() ?? "@posta.pau.edu.tr";

    private string GenerateVerificationToken() =>
        Random.Shared.Next(0, 1_000_000).ToString("D6");

    private int GetVerificationCodeLifetimeSeconds()
    {
        var seconds = _config.GetValue<int?>("EmailVerification:CodeLifetimeSeconds") ?? 120;
        return seconds > 0 ? seconds : 120;
    }

    private DateTime GetVerificationCodeExpiry() =>
        DateTime.UtcNow.AddSeconds(GetVerificationCodeLifetimeSeconds());

    private static string BuildStoredVerificationToken(string token, DateTime expiresAt) =>
        $"{token}:{expiresAt.Ticks}";

    private static bool TryParseStoredVerificationToken(
        string? storedValue,
        out string token,
        out DateTime expiresAt)
    {
        token = string.Empty;
        expiresAt = DateTime.MinValue;

        if (string.IsNullOrWhiteSpace(storedValue))
            return false;

        var parts = storedValue.Split(':', 2, StringSplitOptions.TrimEntries);
        if (parts.Length != 2 || string.IsNullOrWhiteSpace(parts[0]) || !long.TryParse(parts[1], out var ticks))
            return false;

        token = parts[0];
        expiresAt = new DateTime(ticks, DateTimeKind.Utc);
        return true;
    }

    private bool IsEmailDeliveryConfigured() =>
        !string.IsNullOrWhiteSpace(_config["Smtp:Host"]) &&
        !string.IsNullOrWhiteSpace(_config["Smtp:FromEmail"]);

    private async Task SendVerificationEmailAsync(string toEmail, string code)
    {
        if (!TryBuildSmtpClient(out var smtpClient, out var fromEmail, out var fromName))
        {
            throw new InvalidOperationException("Doğrulama kodu şu anda gönderilemiyor. Lütfen daha sonra tekrar deneyin.");
        }

        var client = smtpClient!;
        using var disposableClient = client;
        using var message = new MailMessage
        {
            From = new MailAddress(fromEmail!),
            Subject = "PAU Market kodunuz",
            Body = $"""
                   Merhaba,

                   PAU Market hesabiniz icin dogrulama kodunuz: {code}

                   Bu kod 2 dakika gecerlidir.

                   Tesekkurler.
                   """,
            IsBodyHtml = false,
            SubjectEncoding = Encoding.UTF8,
            BodyEncoding = Encoding.UTF8,
            HeadersEncoding = Encoding.UTF8
        };

        if (!string.IsNullOrWhiteSpace(fromName))
            message.From = new MailAddress(fromEmail!, fromName);

        message.ReplyToList.Add(new MailAddress(fromEmail!));
        message.To.Add(toEmail);

        try
        {
            await client.SendMailAsync(message);
            _logger.LogInformation("Doğrulama e-postası başarıyla gönderildi: {Email}", toEmail);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Doğrulama e-postası gönderilemedi: {Email}", toEmail);
            throw new InvalidOperationException("Doğrulama e-postası gönderilemedi. Lütfen daha sonra tekrar deneyin.");
        }
    }

    private bool TryBuildSmtpClient(out SmtpClient? client, out string? fromEmail, out string fromName)
    {
        var host = _config["Smtp:Host"];
        fromEmail = _config["Smtp:FromEmail"];
        fromName = _config["Smtp:FromName"] ?? "PAÜ Market";

        if (string.IsNullOrWhiteSpace(host) || string.IsNullOrWhiteSpace(fromEmail))
        {
            client = null;
            return false;
        }

        var port = _config.GetValue("Smtp:Port", 587);
        var username = _config["Smtp:Username"];
        var password = _config["Smtp:Password"];
        var enableSsl = _config.GetValue("Smtp:EnableSsl", true);

        client = new SmtpClient(host, port)
        {
            EnableSsl = enableSsl,
            DeliveryMethod = SmtpDeliveryMethod.Network
        };

        if (!string.IsNullOrWhiteSpace(username))
            client.Credentials = new NetworkCredential(username, password);

        return true;
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
