namespace PauMarket.API.Services;

public interface IRecommenderExportService
{
    Task<string> BuildInteractionsCsvAsync();
    Task<string> BuildListingsCsvAsync();
}
