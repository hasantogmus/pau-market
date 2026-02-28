using System.Security.Claims;

namespace PauMarket.API.Extensions;

/// <summary>
/// ClaimsPrincipal üzerinden JWT claim'lerini kolayca okumak için extension metotlar.
/// </summary>
public static class ClaimsPrincipalExtensions
{
    /// <summary>
    /// JWT token'ından (sub claim) giriş yapan kullanıcının int ID'sini döner.
    /// Token yoksa veya ID parse edilemezse <c>null</c> döner.
    /// </summary>
    public static int? GetUserId(this ClaimsPrincipal principal)
    {
        // AuthService, JwtRegisteredClaimNames.Sub = user.Id.ToString() olarak set ediyor.
        // .NET, "sub" claim'ini NameIdentifier olarak map eder.
        var raw = principal.FindFirstValue(ClaimTypes.NameIdentifier)
               ?? principal.FindFirstValue("sub");

        return int.TryParse(raw, out int id) ? id : null;
    }

    /// <summary>
    /// JWT token'ından e-posta adresini döner.
    /// </summary>
    public static string? GetEmail(this ClaimsPrincipal principal) =>
        principal.FindFirstValue(ClaimTypes.Email)
     ?? principal.FindFirstValue("email");
}
