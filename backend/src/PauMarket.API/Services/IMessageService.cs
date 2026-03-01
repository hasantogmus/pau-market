using PauMarket.API.DTOs;

namespace PauMarket.API.Services;

public interface IMessageService
{
    /// <summary>Yeni bir mesaj oluşturur ve veritabanına kaydeder.</summary>
    Task<MessageResponseDto> SendMessageAsync(SendMessageDto dto, int senderId);

    /// <summary>
    /// İki kullanıcı arasında belirli bir ilan üzerindeki konuşmayı tarihe göre sıralı getirir.
    /// </summary>
    Task<IEnumerable<MessageResponseDto>> GetConversationAsync(int currentUserId, int otherUserId, int listingId);

    /// <summary>Belirtilen mesajı 'okundu' olarak işaretler.</summary>
    Task<bool> MarkAsReadAsync(int messageId, int currentUserId);
}
