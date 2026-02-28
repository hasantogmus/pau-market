using PauMarket.API.DTOs;

namespace PauMarket.API.Services;

/// <summary>
/// Kimlik doğrulama işlemleri için servis arayüzü.
/// </summary>
public interface IAuthService
{
    /// <summary>
    /// Yeni kullanıcı kaydeder. E-posta ^[a-z]+\d{2}@posta\.pau\.edu\.tr$ kuralına uymalıdır.
    /// Şifre BCrypt ile hashlenerek saklanır.
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
}
