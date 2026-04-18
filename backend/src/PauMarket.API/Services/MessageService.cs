using Microsoft.EntityFrameworkCore;
using PauMarket.API.Data;
using PauMarket.API.DTOs;
using PauMarket.API.Models;

namespace PauMarket.API.Services;

public class MessageService(PauMarketDbContext context) : IMessageService
{
    public async Task<IEnumerable<MessageThreadDto>> GetInboxAsync(int currentUserId)
    {
        var rawMessages = await context.Messages
            .AsNoTracking()
            .Include(m => m.Sender)
            .Include(m => m.Receiver)
            .Include(m => m.Listing)
            .Where(m => m.SenderId == currentUserId || m.ReceiverId == currentUserId)
            .OrderByDescending(m => m.SentAt)
            .ToListAsync();

        var threads = rawMessages
            .GroupBy(m => new
            {
                m.ListingId,
                OtherUserId = m.SenderId == currentUserId ? m.ReceiverId : m.SenderId
            })
            .Select(group =>
            {
                var latest = group.OrderByDescending(m => m.SentAt).First();
                var otherUser = latest.SenderId == currentUserId ? latest.Receiver : latest.Sender;

                return new MessageThreadDto
                {
                    OtherUserId = otherUser.Id,
                    OtherUserName = $"{otherUser.FirstName} {otherUser.LastName}".Trim(),
                    ListingId = latest.ListingId,
                    ListingTitle = latest.Listing.Title,
                    ListingImageUrl = latest.Listing.ImageUrl,
                    LastMessage = latest.Content,
                    LastMessageAt = latest.SentAt,
                    IsLastMessageMine = latest.SenderId == currentUserId,
                    UnreadCount = group.Count(m => m.ReceiverId == currentUserId && !m.IsRead)
                };
            })
            .OrderByDescending(t => t.LastMessageAt);

        return threads;
    }

    public async Task<MessageResponseDto> SendMessageAsync(SendMessageDto dto, int senderId)
    {
        var message = new Message
        {
            SenderId   = senderId,
            ReceiverId = dto.ReceiverId,
            ListingId  = dto.ListingId,
            Content    = dto.Content,
            IsRead     = false,
            SentAt     = DateTime.UtcNow
        };

        context.Messages.Add(message);
        await context.SaveChangesAsync();

        return MapToResponseDto(message);
    }

    public async Task<IEnumerable<MessageResponseDto>> GetConversationAsync(
        int currentUserId, int otherUserId, int listingId)
    {
        var messages = await context.Messages
            .AsNoTracking()
            .Where(m =>
                m.ListingId == listingId &&
                ((m.SenderId == currentUserId && m.ReceiverId == otherUserId) ||
                 (m.SenderId == otherUserId   && m.ReceiverId == currentUserId)))
            .OrderBy(m => m.SentAt)
            .ToListAsync();

        return messages.Select(MapToResponseDto);
    }

    public async Task<bool> MarkAsReadAsync(int messageId, int currentUserId)
    {
        var message = await context.Messages.FindAsync(messageId);

        if (message is null)
            return false;

        // Yalnızca alıcı 'okundu' olarak işaretleyebilir
        if (message.ReceiverId != currentUserId)
            throw new UnauthorizedAccessException("Bu mesajı okuma yetkiniz yok.");

        message.IsRead = true;
        await context.SaveChangesAsync();
        return true;
    }

    // ── Helper ────────────────────────────────────────────────────────────────

    private static MessageResponseDto MapToResponseDto(Message m) => new()
    {
        Id         = m.Id,
        SenderId   = m.SenderId,
        ReceiverId = m.ReceiverId,
        ListingId  = m.ListingId,
        Content    = m.Content,
        IsRead     = m.IsRead,
        SentAt     = m.SentAt
    };
}
