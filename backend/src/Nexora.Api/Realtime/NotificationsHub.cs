using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using Nexora.Application.Auth;
using Nexora.Application.Realtime;

namespace Nexora.Api.Realtime;

/// <summary>Methods the server can call on connected browsers (strongly typed: no magic strings).</summary>
public interface INotificationsClient
{
    Task OrderPaid(OrderPaidEvent orderPaid);

    Task OrderStatusChanged(OrderStatusChangedEvent statusChanged);

    Task StockLow(StockLowEvent stockLow);
}

/// <summary>
/// Server-to-client notifications only: the hub exposes no methods that browsers can invoke, so it
/// adds no write surface to the API. Authorization happens at connection time; administrators
/// join the "admins" group, and customers are addressed by their user id (Clients.User).
/// </summary>
[Authorize]
public sealed class NotificationsHub : Hub<INotificationsClient>
{
    public const string Path = "/hubs/notifications";
    public const string AdminsGroup = "admins";

    public override async Task OnConnectedAsync()
    {
        // Roles come from the authenticated cookie, never from anything the client sends.
        if (Context.User?.IsInRole(AppRoles.Admin) == true)
        {
            await Groups.AddToGroupAsync(Context.ConnectionId, AdminsGroup);
        }

        await base.OnConnectedAsync();
    }
}
