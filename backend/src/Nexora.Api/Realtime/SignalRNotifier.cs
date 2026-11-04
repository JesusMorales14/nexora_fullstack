using Microsoft.AspNetCore.SignalR;
using Nexora.Application.Realtime;

namespace Nexora.Api.Realtime;

internal sealed partial class SignalRNotifier(
    IHubContext<NotificationsHub, INotificationsClient> hub,
    ILogger<SignalRNotifier> logger) : IRealtimeNotifier
{
    public Task OrderPaidAsync(OrderPaidEvent orderPaid, CancellationToken cancellationToken) =>
        SendSafelyAsync(nameof(INotificationsClient.OrderPaid), () => hub.Clients.Group(NotificationsHub.AdminsGroup).OrderPaid(orderPaid));

    public Task OrderStatusChangedAsync(Guid customerId, OrderStatusChangedEvent statusChanged, CancellationToken cancellationToken) =>
        SendSafelyAsync(nameof(INotificationsClient.OrderStatusChanged), async () =>
        {
            // Clients.User uses the NameIdentifier claim, i.e. the Identity user id.
            await hub.Clients.User(customerId.ToString()).OrderStatusChanged(statusChanged);
            await hub.Clients.Group(NotificationsHub.AdminsGroup).OrderStatusChanged(statusChanged);
        });

    public Task StockLowAsync(StockLowEvent stockLow, CancellationToken cancellationToken) =>
        SendSafelyAsync(nameof(INotificationsClient.StockLow), () => hub.Clients.Group(NotificationsHub.AdminsGroup).StockLow(stockLow));

    private async Task SendSafelyAsync(string eventName, Func<Task> send)
    {
        try
        {
            await send();
        }
        catch (Exception exception) when (exception is not OperationCanceledException)
        {
            // The change is already committed; clients will see it on their next fetch.
            LogSendFailed(logger, eventName, exception);
        }
    }

    [LoggerMessage(Level = LogLevel.Warning, Message = "Realtime notification {EventName} could not be sent")]
    private static partial void LogSendFailed(ILogger logger, string eventName, Exception exception);
}
