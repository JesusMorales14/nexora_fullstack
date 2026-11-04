namespace Nexora.Application.Realtime;

// Event payloads carry identifiers and a few display values only. Clients treat them as a hint and
// re-fetch the real state through the REST API (events can be missed while disconnected).

public sealed record OrderPaidEvent(string OrderNumber, decimal Total, DateTimeOffset OccurredAt);

public sealed record OrderStatusChangedEvent(string OrderNumber, string Status, DateTimeOffset OccurredAt);

public sealed record StockLowEvent(Guid VariantId, string Sku, string ProductName, int Available, DateTimeOffset OccurredAt);

/// <summary>
/// Pushes notifications after a change has been committed. Implementations must never throw:
/// a failed notification cannot undo (or break) a successful business operation.
/// </summary>
public interface IRealtimeNotifier
{
    /// <summary>To administrators.</summary>
    Task OrderPaidAsync(OrderPaidEvent orderPaid, CancellationToken cancellationToken);

    /// <summary>To the order's customer and to administrators.</summary>
    Task OrderStatusChangedAsync(Guid customerId, OrderStatusChangedEvent statusChanged, CancellationToken cancellationToken);

    /// <summary>To administrators.</summary>
    Task StockLowAsync(StockLowEvent stockLow, CancellationToken cancellationToken);
}
