using CloudinaryDotNet;
using CloudinaryDotNet.Actions;
using Microsoft.Extensions.Options;
using PauMarket.API.Settings;

namespace PauMarket.API.Services;

public class PhotoService : IPhotoService
{
    private const long MaxImageFileBytes = 10 * 1024 * 1024;

    private readonly Cloudinary _cloudinary;

    public PhotoService(IOptions<CloudinarySettings> config)
    {
        var acc = new Account(
            config.Value.CloudName,
            config.Value.ApiKey,
            config.Value.ApiSecret
        );

        _cloudinary = new Cloudinary(acc);
    }

    public async Task<string?> AddPhotoAsync(IFormFile file)
    {
        if (file.Length == 0) return null;
        if (file.Length > MaxImageFileBytes)
            throw new InvalidOperationException("File size too large.");

        var allowedMimeTypes = new[] { "image/jpeg", "image/png", "image/webp" };
        var allowedExtensions = new[] { ".jpg", ".jpeg", ".png", ".webp" };
        
        if (!allowedMimeTypes.Contains(file.ContentType.ToLowerInvariant()))
            throw new InvalidOperationException("Geçersiz dosya türü. Yalnızca JPEG, PNG ve WEBP formatları desteklenmektedir.");
            
        var extension = Path.GetExtension(file.FileName).ToLowerInvariant();
        if (!allowedExtensions.Contains(extension))
            throw new InvalidOperationException("Geçersiz dosya uzantısı.");

        await using var stream = file.OpenReadStream();
        var uploadParams = new ImageUploadParams
        {
            File = new FileDescription(file.FileName, stream),
            Transformation = new Transformation().Height(500).Width(500).Crop("fill").Gravity("face")
        };

        var uploadResult = await _cloudinary.UploadAsync(uploadParams);

        if (uploadResult.Error != null)
        {
            throw new Exception(uploadResult.Error.Message);
        }

        return uploadResult.SecureUrl.ToString();
    }

    /// <summary>
    /// Cloudinary'den bir görseli siler. URL'den public ID'yi çıkarır.
    /// </summary>
    public async Task DeletePhotoAsync(string imageUrl)
    {
        if (string.IsNullOrWhiteSpace(imageUrl))
            return;

        try
        {
            // Cloudinary URL formatı: https://res.cloudinary.com/{cloud}/image/upload/v{version}/{publicId}.{ext}
            var uri = new Uri(imageUrl);
            var segments = uri.AbsolutePath.Split('/');
            // Son segment: "{publicId}.{ext}"
            var lastSegment = segments.LastOrDefault();
            if (string.IsNullOrEmpty(lastSegment))
                return;

            var publicId = Path.GetFileNameWithoutExtension(lastSegment);
            if (string.IsNullOrEmpty(publicId))
                return;

            await _cloudinary.DestroyAsync(new DeletionParams(publicId));
        }
        catch
        {
            // Cloudinary silme hatası ana akışı durdurmamalı
        }
    }
}
