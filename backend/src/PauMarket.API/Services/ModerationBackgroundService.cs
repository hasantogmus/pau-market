using Microsoft.EntityFrameworkCore;
using PauMarket.API.Data;

namespace PauMarket.API.Services;

/// <summary>
/// Arka planda çalışan otomatik içerik moderatörü.
/// Yeni eklenen (IsApproved = false) ilanları belirli aralıklarla (örn: 10 saniye) tarar.
/// Küfür, hakaret veya yasaklı kelime içermiyorsa onaylar (IsApproved = true yapar).
/// Eğer içeriyorsa pasife alır (IsActive = false).
/// </summary>
public class ModerationBackgroundService(IServiceProvider serviceProvider, ILogger<ModerationBackgroundService> logger) : BackgroundService
{
    private readonly string[] _bannedWords = {
        "kaçak", "silah", "bıçak", "kumar", "bahis", "kopya", "çalıntı",
        // Gerçek bir sistemde AWS Rekognition veya detaylı bir küfür/spam sözlüğü kullanılır.
    };

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

        // Sadece Onay bekleyen ve Aktif olan ilanları çek
        var pendingListings = await context.Listings
            .Where(l => !l.IsApproved && l.IsActive)
            .Take(50) // Her döngüde en fazla 50 ilan işle
            .ToListAsync(stoppingToken);

        if (pendingListings.Count == 0)
            return;

        int approvedCount = 0;
        int rejectedCount = 0;

        foreach (var listing in pendingListings)
        {
            var contentToScan = $"{listing.Title} {listing.Description}".ToLowerInvariant();

            bool isClean = !_bannedWords.Any(word => contentToScan.Contains(word));

            if (isClean)
            {
                listing.IsApproved = true;
                approvedCount++;
            }
            else
            {
                // Yasaklı içerik bulundu! İlanı hem reddet hem de pasife al.
                listing.IsApproved = false;
                listing.IsActive = false;
                rejectedCount++;
            }
        }

        await context.SaveChangesAsync(stoppingToken);
        logger.LogInformation($"Moderasyon tamamlandı: {approvedCount} onaylandı, {rejectedCount} reddedildi.");
    }
}
