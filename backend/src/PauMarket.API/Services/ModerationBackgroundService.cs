using Microsoft.EntityFrameworkCore;
using PauMarket.API.Data;
using PauMarket.API.Models;
using System.Globalization;

namespace PauMarket.API.Services;

/// <summary>
/// Arka planda çalışan otomatik içerik moderatörü.
/// Yeni eklenen veya düzenlenen ilanları belirli aralıklarla tarar.
/// Temiz içerik onaylanır; uygunsuz içerik reddedilir ve public vitrinden gizlenir.
/// </summary>
public class ModerationBackgroundService(IServiceProvider serviceProvider, ILogger<ModerationBackgroundService> logger) : BackgroundService
{
    private static readonly CultureInfo TurkishCulture = CultureInfo.GetCultureInfo("tr-TR");

    private readonly string[] _bannedWords =
    [
        "kaçak", "silah", "bıçak", "kumar", "bahis", "kopya", "çalıntı",
        "uyuşturucu", "sahte kimlik", "reçetesiz ilaç",
        "porno", "pornografi", "seks", "cinsel", "escort", "erotik",
        "müstehcen", "çıplak", "nude", "18+",
        // Görsel moderasyon için ileride Cloudinary/AWS Rekognition gibi provider bağlanabilir.
    ];

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        logger.LogInformation("Moderation Background Service başlatıldı.");

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await DoWorkAsync(stoppingToken);
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Moderasyon işlemi sırasında bir hata oluştu.");
            }

            // 10 saniyede bir tarama yap (Production'da bu süre Queue sistemine (RabbitMQ) bağlanabilir)
            await Task.Delay(TimeSpan.FromSeconds(10), stoppingToken);
        }
    }

    private async Task DoWorkAsync(CancellationToken stoppingToken)
    {
        // BackgroundService Singleton olduğu için DbContext (Scoped) erişimi IServiceProvider ile yapılır.
        using var scope = serviceProvider.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<PauMarketDbContext>();

        // Sadece moderasyon bekleyen ilanları çek.
        var pendingListings = await context.Listings
            .Where(l => l.ModerationStatus == ListingModerationStatus.Pending && l.IsActive && !l.IsSold)
            .Take(50)
            .ToListAsync(stoppingToken);

        if (pendingListings.Count == 0)
            return;

        int approvedCount = 0;
        int rejectedCount = 0;

        foreach (var listing in pendingListings)
        {
            var contentToScan = $"{listing.Title} {listing.Description}".ToLower(TurkishCulture);

            bool isClean = !_bannedWords.Any(word => contentToScan.Contains(word));

            if (isClean)
            {
                listing.IsApproved = true;
                listing.ModerationStatus = ListingModerationStatus.Approved;
                listing.ModerationReason = null;
                approvedCount++;
            }
            else
            {
                // Reddedilen ilan aktif kalır; sadece public vitrinden gizlenir.
                listing.IsApproved = false;
                listing.ModerationStatus = ListingModerationStatus.Rejected;
                listing.ModerationReason = "İlan metninde platform kurallarına uygun olmayan ifade tespit edildi.";
                rejectedCount++;
            }
        }

        await context.SaveChangesAsync(stoppingToken);
        logger.LogInformation($"Moderasyon tamamlandı: {approvedCount} onaylandı, {rejectedCount} reddedildi.");
    }
}
