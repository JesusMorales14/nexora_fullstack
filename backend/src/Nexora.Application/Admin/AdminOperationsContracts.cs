using Nexora.Application.Common;
using Nexora.Application.Orders;

namespace Nexora.Application.Admin;

public sealed class AdminOrderListRequest
{
    public int? Page { get; init; }

    public int? PageSize { get; init; }

    /// <summary>Order number or customer email.</summary>
    public string? Q { get; init; }

    public string? Status { get; init; }
}

public sealed class OrderStatusChangeRequest
{
    /// <summary>Target status: "Shipped", "Delivered" or "Cancelled".</summary>
    public string Status { get; init; } = string.Empty;
}

public sealed class AdminCustomerListRequest
{
    public int? Page { get; init; }

    public int? PageSize { get; init; }

    public string? Q { get; init; }
}

public sealed class GrantAdministratorRequest
{
    public string Email { get; init; } = string.Empty;
}

public sealed record AdminOrderListItem(
    string OrderNumber,
    string Status,
    string CustomerEmail,
    string CustomerName,
    DateTimeOffset CreatedAt,
    int ItemCount,
    decimal Total);

public sealed record AdminOrderDetails(
    OrderResponse Order,
    string CustomerEmail,
    string CustomerName,
    DateTimeOffset? ShippedAt,
    IReadOnlyList<string> AllowedTransitions);

public sealed record AdminCustomerListItem(
    Guid Id,
    string Email,
    string FullName,
    DateTimeOffset CreatedAt,
    int OrderCount,
    decimal TotalSpent,
    DateTimeOffset? LastOrderAt);

public sealed record AdministratorResponse(Guid Id, string Email, string FullName, bool IsCurrentUser);

public interface IAdminOperationsService
{
    Task<PagedResponse<AdminOrderListItem>> ListOrdersAsync(AdminOrderListRequest request, CancellationToken cancellationToken);

    Task<AdminOrderDetails?> GetOrderAsync(string orderNumber, CancellationToken cancellationToken);

    /// <summary>Paid → Shipped → Delivered; unpaid orders can be cancelled (their stock is released).</summary>
    Task<CommandResult<AdminOrderDetails>> ChangeOrderStatusAsync(string orderNumber, string status, CancellationToken cancellationToken);

    Task<PagedResponse<AdminCustomerListItem>> ListCustomersAsync(AdminCustomerListRequest request, CancellationToken cancellationToken);

    /// <summary>CSV of orders created in [firstDay, endExclusive). Values are neutralized against spreadsheet formula injection.</summary>
    Task<string> ExportOrdersCsvAsync(DateOnly firstDay, DateOnly endExclusive, CancellationToken cancellationToken);

    Task<IReadOnlyList<AdministratorResponse>> ListAdministratorsAsync(CancellationToken cancellationToken);

    Task<CommandResult<AdministratorResponse>> GrantAdministratorAsync(string email, CancellationToken cancellationToken);

    Task<CommandResult<bool>> RevokeAdministratorAsync(Guid userId, CancellationToken cancellationToken);
}
