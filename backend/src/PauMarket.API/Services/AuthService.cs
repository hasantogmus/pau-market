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
    // ^[a-z]+\d{2}@posta\.pau\.edu\.tr$
    // Regex grupları: 1 = harf kısmı, 2 = 2 rakamlı yıl kısmı
    private static readonly Regex PauEmailRegex =
        new(@"^(?<letters>[a-z]+)(?<year>\d{2})@posta\.pau\.edu\.tr$", RegexOptions.Compiled);

    // Türkçe → İngilizce karakter dönüşüm tablosu
    private static readonly Dictionary<char, char> TurkishMap = new()
    {
        ['ı'] = 'i', ['İ'] = 'i',
        ['ğ'] = 'g', ['Ğ'] = 'g',
        ['ü'] = 'u', ['Ü'] = 'u',
        ['ş'] = 's', ['Ş'] = 's',
        ['ö'] = 'o', ['Ö'] = 'o',
        ['ç'] = 'c', ['Ç'] = 'c',
    };

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
        // ── Adım 0: Temel format kontrolü ──────────────────────────────────
        var match = PauEmailRegex.Match(dto.Email);
        if (!match.Success)
            throw new InvalidOperationException("Geçersiz okul e-posta formatı");

        string emailLetterPart = match.Groups["letters"].Value; // örn: "htogmus"
        string emailYearPart   = match.Groups["year"].Value;    // örn: "21"

        // ── Kural 1: Ad/Soyad – E-posta Eşleşmesi ──────────────────────────
        //    firstNameInitial (1 harf) + fullLastName → Türkçe normalize → karşılaştır
        ValidateNameEmailMatch(dto.FirstName, dto.LastName, emailLetterPart);

        // ── Kural 2: Giriş Yılı – Öğrenci Numarası Eşleşmesi ───────────────
        ValidateStudentNumberYear(dto.StudentNumber, emailYearPart);

        // ── Adım 3: E-posta daha önce kullanılmış mı? ───────────────────────
        bool emailExists = await _db.Users
            .AnyAsync(u => u.Email == dto.Email.ToLower());
        if (emailExists)
            throw new InvalidOperationException("Bu e-posta adresi zaten kayıtlı.");

        // ── Kural 3: Aktif SMTP Kutusu Kontrolü ────────────────────────────
        //    Bağlantı hatası → geç (graceful degrade), 550 yanıtı → engelle
        await CheckSmtpMailboxOrThrowAsync(dto.Email);

        // ── Adım 4: BCrypt şifre hashleme (work factor: 12) ────────────────
        string passwordHash = BCrypt.Net.BCrypt.HashPassword(dto.Password, workFactor: 12);

        // ── Adım 5: 6 haneli rastgele doğrulama kodu üret ──────────────────
        string verificationToken = Random.Shared.Next(0, 1_000_000).ToString("D6");

        // ── Adım 6: Kullanıcıyı oluştur ve kaydet ──────────────────────────
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

        // ── Adım 7: E-posta simülasyonu (konsola yaz) ──────────────────────
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

    // ─── Validation Helpers ──────────────────────────────────────────────────

    /// <summary>
    /// Kural 1: İsmin baş harfi + soyadın tamamı, Türkçe→İng normalize edilip
    /// e-postanın harf kısmıyla karşılaştırılır.
    /// </summary>
    private static void ValidateNameEmailMatch(string firstName, string lastName, string emailLetterPart)
    {
        // firstNameInitial: ilk ismin sadece ilk harfi
        string firstInitial = NormalizeTurkish(firstName[0].ToString());
        // lastNameNorm: soyadın tamamı normalize edilmiş hali
        string lastNameNorm = NormalizeTurkish(lastName);

        // Beklenen e-posta harf kısmı: baş harf + soyad
        string expected = firstInitial + lastNameNorm;  // örn: "h" + "togmus" = "htogmus"

        if (expected != emailLetterPart)
            throw new InvalidOperationException(
                "E-posta adresi ad/soyad ile uyuşmuyor. " +
                $"Beklenen format: {expected}XX@posta.pau.edu.tr");
    }

    /// <summary>
    /// Kural 2: Öğrenci numarasının ilk 2 hanesi, e-postadaki giriş yılıyla eşleşmeli.
    /// </summary>
    private static void ValidateStudentNumberYear(string studentNumber, string emailYearPart)
    {
        // Yalnızca rakamları al (kullanıcı tire veya boşluk girebilir)
        string digitsOnly = new string(studentNumber.Where(char.IsDigit).ToArray());

        if (digitsOnly.Length < 2)
            throw new InvalidOperationException("Öğrenci numarası geçersiz.");

        string studentYear = digitsOnly[..2]; // İlk 2 rakam → örn: "21"

        if (studentYear != emailYearPart)
            throw new InvalidOperationException(
                "Giriş yılı öğrenci numarasıyla eşleşmiyor. " +
                $"Öğrenci numaranızın yılı '{studentYear}', e-posta yılı '{emailYearPart}'.");
    }

    /// <summary>
    /// Türkçe karakterleri İngilizce karşılıklarına dönüştürür ve küçük harfe indirir.
    /// </summary>
    private static string NormalizeTurkish(string input)
    {
        var sb = new StringBuilder(input.Length);
        foreach (char c in input)
        {
            // Önce Türkçe özel karakter mi kontrol et
            char mapped = TurkishMap.TryGetValue(c, out char replacement)
                ? replacement
                : char.ToLowerInvariant(c);
            sb.Append(mapped);
        }
        return sb.ToString();
    }

    // ─── SMTP Mailbox Kontrolü ────────────────────────────────────────────────

    /// <summary>
    /// Kural 3: PAÜ posta sunucusuna SMTP üzerinden bağlanıp RCPT TO ile
    /// e-posta kutusunun aktif olup olmadığını kontrol eder.
    ///
    /// Davranış:
    ///   - 550 yanıtı → InvalidOperationException (mailbox yok / kapalı)
    ///   - Bağlantı/timeout hatası → graceful degrade (log yaz, devam et)
    /// </summary>
    private async Task CheckSmtpMailboxOrThrowAsync(string email)
    {
        try
        {
            // ── 1. DNS MX kaydını çek ──────────────────────────────────────
            string domain   = email.Split('@')[1];          // "posta.pau.edu.tr"
            string? mxHost  = await ResolveMxHostAsync(domain);

            if (mxHost is null)
            {
                _logger.LogWarning("SMTP kontrol: {Domain} için MX kaydı bulunamadı, geçiliyor.", domain);
                return; // graceful degrade
            }

            // ── 2. TcpClient ile port 25 bağlantısı ──────────────────────
            // Not: Bazı sunucular port 25'i kapatmış olabilir; timeout → graceful degrade
            using var cts    = new CancellationTokenSource(TimeSpan.FromSeconds(8));
            using var tcp    = new TcpClient();
            await tcp.ConnectAsync(mxHost, 25, cts.Token);

            using var stream = tcp.GetStream();
            using var reader = new StreamReader(stream,  Encoding.ASCII);
            using var writer = new StreamWriter(stream,  Encoding.ASCII) { AutoFlush = true };

            // ── 3. SMTP el sıkışması ──────────────────────────────────────
            string? banner = await reader.ReadLineAsync(cts.Token);
            _logger.LogDebug("SMTP banner ({Host}): {Banner}", mxHost, banner);

            // EHLO
            await writer.WriteLineAsync($"EHLO paumarket.local");
            await SkipMultilineResponseAsync(reader, cts.Token);

            // MAIL FROM (boş/sistem adresi)
            await writer.WriteLineAsync("MAIL FROM:<noreply@paumarket.local>");
            string? mailFromResp = await reader.ReadLineAsync(cts.Token);
            _logger.LogDebug("MAIL FROM resp: {R}", mailFromResp);

            // RCPT TO — asıl kontrol burası
            await writer.WriteLineAsync($"RCPT TO:<{email}>");
            string? rcptResp = await reader.ReadLineAsync(cts.Token);
            _logger.LogDebug("RCPT TO resp ({Email}): {R}", email, rcptResp);

            // QUIT
            await writer.WriteLineAsync("QUIT");

            // ── 4. Yanıt değerlendirmesi ──────────────────────────────────
            if (rcptResp is not null && rcptResp.StartsWith("55"))
            {
                // 550 / 551 / 552 / 553 → mailbox yok veya kapalı
                throw new InvalidOperationException(
                    "Bu e-posta adresi artık aktif değil (kapanmış veya geçersiz).");
            }
            // 250 / 251 / 252 / 450 (geçici) → kabul → devam
        }
        catch (InvalidOperationException)
        {
            // Kendi fırlattığımız iş kuralı hatası → yukarıya ilet
            throw;
        }
        catch (OperationCanceledException)
        {
            _logger.LogWarning("SMTP kontrol: {Email} için bağlantı zaman aşımına uğradı, geçiliyor.", email);
            // Graceful degrade: timeout → kaydı engelleme
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "SMTP kontrol: {Email} için beklenmeyen hata, geçiliyor.", email);
            // Graceful degrade: her türlü ağ/socket hatası → kaydı engelleme
        }
    }

    /// <summary>
    /// DnsClient ile verilen domain'in en düşük öncelikli MX kaydını döner.
    /// </summary>
    private static async Task<string?> ResolveMxHostAsync(string domain)
    {
        try
        {
            var dns     = new LookupClient();
            var result  = await dns.QueryAsync(domain, QueryType.MX);
            var mxRecord = result.Answers
                .MxRecords()
                .OrderBy(r => r.Preference)
                .FirstOrDefault();

            return mxRecord?.Exchange.Value?.TrimEnd('.');
        }
        catch
        {
            return null; // DNS hatası → graceful degrade
        }
    }

    /// <summary>
    /// SMTP multi-line yanıtlarını (örn: EHLO'ya gelen 250-... satırları) tüketir.
    /// </summary>
    private static async Task SkipMultilineResponseAsync(StreamReader reader, CancellationToken ct)
    {
        string? line;
        do
        {
            line = await reader.ReadLineAsync(ct);
        }
        while (line is not null && line.Length >= 4 && line[3] == '-');
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
            new Claim(JwtRegisteredClaimNames.Jti,        Guid.NewGuid().ToString())
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
