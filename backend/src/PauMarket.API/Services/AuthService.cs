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

    private sealed record SmtpSenderSettings(
        string Label,
        string? Host,
        int Port,
        string? Username,
        string? Password,
        bool EnableSsl,
        string? FromEmail,
        string FromName);

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

            if (HasUsableVerificationCode(existingUser.EmailVerificationToken))
            {
                return "Bu hesap için yakın zamanda bir doğrulama kodu gönderildi. Lütfen e-posta kutundaki son kodu kullan; süre dolunca yeni kod isteyebilirsin.";
            }

            var resendToken = GenerateVerificationToken();
            var resendExpiresAt = GetVerificationCodeExpiry();
            await SendVerificationEmailAsync(existingUser.Email, resendToken, GetUserDisplayName(existingUser), isResend: true);
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

        await SendVerificationEmailAsync(user.Email, verificationToken, GetUserDisplayName(user), isResend: false);
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

        if (HasUsableVerificationCode(user.EmailVerificationToken))
            return "Önceki doğrulama kodun hâlâ geçerli. Gereksiz e-posta filtresine takılmaması için süre dolana kadar yeni kod göndermiyoruz.";

        var verificationToken = GenerateVerificationToken();
        var verificationExpiresAt = GetVerificationCodeExpiry();
        if (!IsEmailDeliveryConfigured())
            throw new InvalidOperationException("Doğrulama kodu şu anda gönderilemiyor. Lütfen daha sonra tekrar deneyin.");

        await SendVerificationEmailAsync(user.Email, verificationToken, GetUserDisplayName(user), isResend: true);
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

    private static bool HasUsableVerificationCode(string? storedValue) =>
        TryParseStoredVerificationToken(storedValue, out _, out var expiresAt) &&
        expiresAt > DateTime.UtcNow;

    private static string GetUserDisplayName(User user) =>
        $"{user.FirstName} {user.LastName}".Trim();

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
        GetConfiguredSmtpSenders().Count > 0;

    private async Task SendVerificationEmailAsync(string toEmail, string code, string recipientName, bool isResend)
    {
        var senders = GetConfiguredSmtpSenders();
        if (senders.Count == 0)
        {
            throw new InvalidOperationException("Doğrulama kodu şu anda gönderilemiyor. Lütfen daha sonra tekrar deneyin.");
        }

        var successfulSends = 0;
        Exception? lastError = null;

        foreach (var sender in OrderSmtpSendersForAttempt(senders, isResend))
        {
            if (successfulSends > 0)
                break;

            try
            {
                using var client = BuildSmtpClient(sender);
                using var message = BuildVerificationEmail(sender, toEmail, code, recipientName, isResend);
                await client.SendMailAsync(message);
                successfulSends++;

                _logger.LogInformation(
                    "Doğrulama e-postası {SenderLabel} göndericisiyle başarıyla gönderildi: {Email}",
                    sender.Label,
                    toEmail);
            }
            catch (Exception ex)
            {
                lastError = ex;
                _logger.LogWarning(
                    ex,
                    "Doğrulama e-postası {SenderLabel} göndericisiyle gönderilemedi: {Email}",
                    sender.Label,
                    toEmail);
            }
        }

        if (successfulSends == 0)
        {
            _logger.LogError(lastError, "Doğrulama e-postası hiçbir SMTP göndericisiyle gönderilemedi: {Email}", toEmail);
            throw new InvalidOperationException("Doğrulama e-postası gönderilemedi. Lütfen daha sonra tekrar deneyin.");
        }

        if (successfulSends > 1)
        {
            _logger.LogInformation(
                "Doğrulama kodu teslim edilebilirliği artırmak için {Count} SMTP göndericisiyle gönderildi: {Email}",
                successfulSends,
                toEmail);
        }
    }

    private List<SmtpSenderSettings> GetConfiguredSmtpSenders()
    {
        var senders = new List<SmtpSenderSettings>();
        AddIfConfigured(senders, BuildSmtpSenderSettings("Primary", "Smtp"));
        AddIfConfigured(senders, BuildSmtpSenderSettings("Backup", "SmtpBackup"));

        return senders
            .GroupBy(sender => new
            {
                Host = sender.Host?.Trim().ToLowerInvariant(),
                Username = sender.Username?.Trim().ToLowerInvariant(),
                FromEmail = sender.FromEmail?.Trim().ToLowerInvariant()
            })
            .Select(group => group.First())
            .ToList();
    }

    private static IEnumerable<SmtpSenderSettings> OrderSmtpSendersForAttempt(
        List<SmtpSenderSettings> senders,
        bool isResend)
    {
        var primary = senders.FirstOrDefault(sender => sender.Label == "Primary");
        var backup = senders.FirstOrDefault(sender => sender.Label == "Backup");

        if (primary is not null)
            yield return primary;

        if (backup is not null)
            yield return backup;

        foreach (var sender in senders.Where(sender => sender != primary && sender != backup))
            yield return sender;
    }

    private SmtpSenderSettings BuildSmtpSenderSettings(string label, string sectionName) =>
        new(
            label,
            _config[$"{sectionName}:Host"],
            _config.GetValue($"{sectionName}:Port", 587),
            _config[$"{sectionName}:Username"],
            _config[$"{sectionName}:Password"],
            _config.GetValue($"{sectionName}:EnableSsl", true),
            _config[$"{sectionName}:FromEmail"],
            _config[$"{sectionName}:FromName"] ?? "PAU Market");

    private static void AddIfConfigured(List<SmtpSenderSettings> senders, SmtpSenderSettings sender)
    {
        if (!string.IsNullOrWhiteSpace(sender.Host) && !string.IsNullOrWhiteSpace(sender.FromEmail))
            senders.Add(sender);
    }

    private static SmtpClient BuildSmtpClient(SmtpSenderSettings sender)
    {
        var client = new SmtpClient(sender.Host, sender.Port)
        {
            EnableSsl = sender.EnableSsl,
            DeliveryMethod = SmtpDeliveryMethod.Network
        };

        if (!string.IsNullOrWhiteSpace(sender.Username))
            client.Credentials = new NetworkCredential(sender.Username, sender.Password);

        return client;
    }

    private static MailMessage BuildVerificationEmail(
        SmtpSenderSettings sender,
        string toEmail,
        string code,
        string recipientName,
        bool isResend)
    {
        var fromAddress = string.IsNullOrWhiteSpace(sender.FromName)
            ? new MailAddress(sender.FromEmail!)
            : new MailAddress(sender.FromEmail!, sender.FromName, Encoding.UTF8);

        var safeRecipientName = NormalizeRecipientName(recipientName);
        var subject = BuildVerificationSubject(safeRecipientName, isResend);
        var plainTextBody = BuildVerificationPlainText(code, safeRecipientName, isResend);
        var htmlBody = BuildVerificationHtml(code, safeRecipientName, isResend);

        var message = new MailMessage
        {
            From = fromAddress,
            Sender = fromAddress,
            Subject = subject,
            Body = plainTextBody,
            IsBodyHtml = false,
            Priority = MailPriority.Normal,
            SubjectEncoding = Encoding.UTF8,
            BodyEncoding = Encoding.UTF8,
            HeadersEncoding = Encoding.UTF8
        };

        message.AlternateViews.Add(AlternateView.CreateAlternateViewFromString(
            plainTextBody,
            Encoding.UTF8,
            "text/plain"));
        message.AlternateViews.Add(AlternateView.CreateAlternateViewFromString(
            htmlBody,
            Encoding.UTF8,
            "text/html"));
        message.ReplyToList.Add(fromAddress);
        message.To.Add(toEmail);
        message.Headers.Add("X-Auto-Response-Suppress", "All");
        message.Headers.Add("Auto-Submitted", "auto-generated");
        message.Headers.Add("X-PauMarket-Email-Type", "email-verification");

        return message;
    }

    private static string NormalizeRecipientName(string recipientName) =>
        string.Join(' ', recipientName.Split(' ', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries))
            .Replace('\r', ' ')
            .Replace('\n', ' ');

    private static string BuildVerificationSubject(string recipientName, bool isResend)
    {
        var prefix = isResend ? "PAU Market yeni dogrulama kodu" : "PAU Market dogrulama kodu";
        return string.IsNullOrWhiteSpace(recipientName)
            ? prefix
            : $"{prefix} - {recipientName}";
    }

    private static string BuildVerificationPlainText(string code, string recipientName, bool isResend)
    {
        var greeting = string.IsNullOrWhiteSpace(recipientName) ? "Merhaba," : $"Merhaba {recipientName},";
        var intro = isResend
            ? "PAU Market hesabin icin yeni dogrulama kodun:"
            : "PAU Market hesabini dogrulamak icin kodun:";

        return $"""
        {greeting}

        {intro} {code}

        Bu kod 2 dakika gecerlidir. Kodu sen istemediysen bu e-postayi yok sayabilirsin.

        PAU Market
        """;
    }

    private static string BuildVerificationHtml(string code, string recipientName, bool isResend)
    {
        var greeting = string.IsNullOrWhiteSpace(recipientName) ? "Merhaba," : $"Merhaba {WebUtility.HtmlEncode(recipientName)},";
        var title = isResend ? "Yeni e-posta dogrulama kodun" : "E-posta dogrulama kodun";
        var intro = isResend
            ? "PAU Market hesabini aktifleştirmek icin yeni kodun hazir."
            : "PAU Market hesabini aktifleştirmek icin asagidaki 6 haneli kodu kullanabilirsin.";

        return
        $$"""
        <!doctype html>
        <html lang="tr">
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <meta name="x-apple-disable-message-reformatting">
          <title>PAU Market dogrulama kodu</title>
        </head>
        <body style="margin:0;padding:0;background:#eef4ff;color:#111827;font-family:Arial,Helvetica,sans-serif;">
          <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">
            PAU Market hesabini dogrulamak icin 6 haneli kodun hazir.
          </div>

          <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#eef4ff;margin:0;padding:32px 12px;">
            <tr>
              <td align="center">
                <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:560px;background:#ffffff;border-radius:24px;border:1px solid #dbe7ff;box-shadow:0 18px 50px rgba(37,99,235,.14);overflow:hidden;">
                  <tr>
                    <td style="background:#155eef;padding:24px 28px;color:#ffffff;">
                      <div style="font-size:13px;letter-spacing:.08em;text-transform:uppercase;font-weight:700;opacity:.9;">PAU Market</div>
                      <h1 style="margin:10px 0 0;font-size:26px;line-height:1.25;font-weight:800;">{{title}}</h1>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:30px 28px 8px;">
                      <p style="margin:0 0 18px;font-size:16px;line-height:1.6;color:#374151;">
                        {{greeting}} {{intro}}
                      </p>
                      <div style="background:#f5f8ff;border:1px solid #cfe0ff;border-radius:18px;padding:22px;text-align:center;">
                        <div style="font-size:12px;line-height:1.4;color:#64748b;font-weight:700;letter-spacing:.08em;text-transform:uppercase;">Dogrulama kodu</div>
                        <div style="font-size:38px;line-height:1.2;font-weight:800;letter-spacing:.16em;color:#155eef;margin-top:8px;">{{code}}</div>
                      </div>
                      <p style="margin:18px 0 0;font-size:14px;line-height:1.6;color:#64748b;">
                        Bu kod 2 dakika gecerlidir. Kodu sen istemediysen bu e-postayi yok sayabilirsin.
                      </p>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:18px 28px 28px;">
                      <div style="border-top:1px solid #e5e7eb;padding-top:18px;font-size:12px;line-height:1.6;color:#94a3b8;">
                        Bu mesaj PAU Market hesap dogrulama islemi icin otomatik olarak gonderildi.
                      </div>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
        """;
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
