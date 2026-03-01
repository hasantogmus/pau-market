using PauMarket.API.DTOs;

namespace PauMarket.API.Services;

/// <summary>
/// Satıcı gösterge paneli (Dashboard) işlemleri servis kontratı.
/// </summary>
public interface IDashboardService
{
    /// <summary>
    /// Belirtilen kullanıcının/satıcının özet istatistiklerini getirir.
    /// Aktif ilan sayısı, toplam görüntülenme, favoriye eklenme ve değerlendirme skoru gibi metrikleri içerir.
    /// </summary>
    Task<DashboardSummaryDto> GetUserDashboardAsync(int userId);
}
