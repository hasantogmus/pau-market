using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

namespace PauMarket.API.Hubs;

/// <summary>
/// Gerçek zamanlı mesajlaşma için SignalR Hub merkezi.
/// Her kullanıcı bağlandığında kendi ID'si ile bir gruba (room) eklenir.
/// Böylece sadece o kullanıcıya anlık bildirim / mesaj gönderebiliriz.
/// </summary>
[Authorize]
public class ChatHub : Hub
{
    public override async Task OnConnectedAsync()
    {
        var userIdStr = Context.User?.Claims.FirstOrDefault(c => c.Type == "id")?.Value;
        
        if (!string.IsNullOrEmpty(userIdStr))
        {
            // Kullanıcıyı kendi ID'siyle aynı adı taşıyan bir "grup" (room) içine alıyoruz.
            // Örn: "User_45"
            await Groups.AddToGroupAsync(Context.ConnectionId, $"User_{userIdStr}");
        }

        await base.OnConnectedAsync();
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        var userIdStr = Context.User?.Claims.FirstOrDefault(c => c.Type == "id")?.Value;
        
        if (!string.IsNullOrEmpty(userIdStr))
        {
            await Groups.RemoveFromGroupAsync(Context.ConnectionId, $"User_{userIdStr}");
        }

        await base.OnDisconnectedAsync(exception);
    }
}
