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

        var dealRequests = await context.DealRequests
            .AsNoTracking()
            .Include(item => item.Listing)
            .Include(item => item.Buyer)
            .Include(item => item.Seller)
            .Where(item => item.BuyerId == currentUserId || item.SellerId == currentUserId)
            .OrderByDescending(item => item.RequestedAt)
            .ToListAsync();

        var messageThreads = rawMessages
            .GroupBy(m => new
            {
                m.ListingId,
                OtherUserId = m.SenderId == currentUserId ? m.ReceiverId : m.SenderId
            })
            .Select(group =>
            {
                var latest = group.OrderByDescending(m => m.SentAt).First();
                var otherUser = latest.SenderId == currentUserId ? latest.Receiver : latest.Sender;
                var dealRequest = dealRequests.FirstOrDefault(item =>
                    item.ListingId == latest.ListingId &&
                    ((item.BuyerId == currentUserId && item.SellerId == otherUser.Id) ||
                     (item.SellerId == currentUserId && item.BuyerId == otherUser.Id)));

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
                    UnreadCount = group.Count(m => m.ReceiverId == currentUserId && !m.IsRead),
                    ListingIsSold = latest.Listing.IsSold,
                    DealRequestId = dealRequest?.Id,
                    DealRequestStatus = dealRequest is null ? null : (int)dealRequest.Status,
                    DealRequestStatusName = dealRequest?.Status.ToString(),
                    DealRequestNote = dealRequest?.Note,
                    CanRespondToDealRequest = dealRequest is not null &&
                                              dealRequest.SellerId == currentUserId &&
                                              dealRequest.Status == DealRequestStatus.Pending
                };
            })
            .Where(thread => CanAccessThread(thread.ListingIsSold, currentUserId, thread.OtherUserId, rawMessages.First(item => item.ListingId == thread.ListingId).Listing))
            .ToList();

        foreach (var request in dealRequests)
        {
            var otherUser = request.BuyerId == currentUserId ? request.Seller : request.Buyer;
            var existingThread = messageThreads.FirstOrDefault(item =>
                item.ListingId == request.ListingId && item.OtherUserId == otherUser.Id);

            if (!CanAccessSoldListing(request.Listing, currentUserId, otherUser.Id))
                continue;

            if (existingThread is not null)
                continue;

            messageThreads.Add(new MessageThreadDto
            {
                OtherUserId = otherUser.Id,
                OtherUserName = $"{otherUser.FirstName} {otherUser.LastName}".Trim(),
                ListingId = request.ListingId,
                ListingTitle = request.Listing.Title,
                ListingImageUrl = request.Listing.ImageUrl,
                LastMessage = string.IsNullOrWhiteSpace(request.Note) ? "Anlaşma isteği gönderildi." : request.Note!,
                LastMessageAt = request.RequestedAt,
                IsLastMessageMine = request.BuyerId == currentUserId,
                UnreadCount = 0,
                ListingIsSold = request.Listing.IsSold,
                DealRequestId = request.Id,
                DealRequestStatus = (int)request.Status,
                DealRequestStatusName = request.Status.ToString(),
                DealRequestNote = request.Note,
                CanRespondToDealRequest = request.SellerId == currentUserId && request.Status == DealRequestStatus.Pending
            });
        }

        return messageThreads.OrderByDescending(item => item.LastMessageAt);
    }

    public async Task<MessageResponseDto> SendMessageAsync(SendMessageDto dto, int senderId)
    {
        var listing = await context.Listings
            .AsNoTracking()
            .FirstOrDefaultAsync(item => item.Id == dto.ListingId);

        if (listing is null)
            throw new InvalidOperationException("Mesaj gönderilecek ilan bulunamadı.");

        if (senderId == dto.ReceiverId)
            throw new InvalidOperationException("Kendi kendinize mesaj gönderemezsiniz.");

        if (listing.UserId != senderId && listing.UserId != dto.ReceiverId)
            throw new InvalidOperationException("Mesajlar yalnızca satıcı ile alıcı arasında gönderilebilir.");

        if (!CanAccessSoldListing(listing, senderId, dto.ReceiverId))
            throw new UnauthorizedAccessException("Bu satılmış ilan için yalnızca satıcı ve alıcı mesajlaşabilir.");

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
        if (senderId != listing.UserId)
        {
            await UpsertInteractionAsync(senderId, dto.ListingId, InteractionType.Message);
        }

        await context.SaveChangesAsync();

        return MapToResponseDto(message);
    }

    public async Task<IEnumerable<MessageResponseDto>> GetConversationAsync(
        int currentUserId, int otherUserId, int listingId)
    {
        var listing = await context.Listings
            .AsNoTracking()
            .FirstOrDefaultAsync(item => item.Id == listingId);

        if (listing is null)
            throw new InvalidOperationException("Konuşma ilanı bulunamadı.");

        if (!CanAccessSoldListing(listing, currentUserId, otherUserId))
            throw new UnauthorizedAccessException("Bu satılmış ilana ait konuşmayı görüntüleyemezsiniz.");

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

    private static bool CanAccessThread(bool listingIsSold, int currentUserId, int otherUserId, Listing listing)
    {
        if (!listingIsSold)
            return true;

        return CanAccessSoldListing(listing, currentUserId, otherUserId);
    }

    private static bool CanAccessSoldListing(Listing listing, int currentUserId, int otherUserId)
    {
        if (!listing.IsSold)
            return true;

        if (listing.SoldToUserId is null)
            return false;

        var allowedUsers = new[] { listing.UserId, listing.SoldToUserId.Value };
        return allowedUsers.Contains(currentUserId) && allowedUsers.Contains(otherUserId);
    }

    private async Task UpsertInteractionAsync(int userId, int listingId, InteractionType interactionType)
    {
        var existingInteraction = await context.Interactions.FirstOrDefaultAsync(interaction =>
            interaction.UserId == userId &&
            interaction.ListingId == listingId &&
            interaction.InteractionType == interactionType);

        if (existingInteraction is not null)
        {
            existingInteraction.Timestamp = DateTime.UtcNow;
            return;
        }

        context.Interactions.Add(new Interaction
        {
            UserId = userId,
            ListingId = listingId,
            InteractionType = interactionType,
            Timestamp = DateTime.UtcNow
        });
    }
}
