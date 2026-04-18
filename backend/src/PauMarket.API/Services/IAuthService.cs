using PauMarket.API.DTOs;

namespace PauMarket.API.Services;

/// <summary>
/// Kimlik doğrulama işlemleri için servis arayüzü.
/// </summary>
public interface IAuthService
{
    /// <summary>
    /// Yeni kullanıcı kaydeder ve doğrulama kodu üretir.
    /// </summary>
    /// <param name="dto">Kayıt bilgileri</param>
    /// <returns>İşlem mesajı (başarı veya hata detayı)</returns>
    Task<string> RegisterAsync(RegisterDto dto);

    /// <summary>
    /// Kullanıcı girişini doğrular ve başarı durumunda JWT token döner.
    /// </summary>
    /// <param name="dto">Giriş bilgileri</param>
    /// <returns>JWT token string'i; başarısız girişte null</returns>
    Task<string?> LoginAsync(LoginDto dto);

    /// <summary>
    /// Kullanıcının 6 haneli doğrulama kodunu kontrol eder ve hesabı onaylar.
    /// </summary>
    /// <param name="email">Doğrulanacak e-posta adresi</param>
    /// <param name="token">Kayıt sırasında üretilen 6 haneli kod</param>
    /// <returns>İşlem mesajı</returns>
    Task<string> VerifyEmailAsync(string email, string token);

    /// <summary>
    /// Kullanıcı için yeni bir doğrulama kodu üretir ve tekrar gönderir.
    /// </summary>
    /// <param name="email">Doğrulama kodu yeniden gönderilecek e-posta adresi</param>
    /// <returns>İşlem mesajı</returns>
    Task<string> ResendVerificationAsync(string email);
}
