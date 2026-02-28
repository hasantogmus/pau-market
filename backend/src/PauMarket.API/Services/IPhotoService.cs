namespace PauMarket.API.Services;

public interface IPhotoService
{
    Task<string?> AddPhotoAsync(IFormFile file);
}
