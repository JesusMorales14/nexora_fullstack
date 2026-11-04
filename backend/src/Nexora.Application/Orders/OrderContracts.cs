namespace Nexora.Application.Orders;

public sealed record OrderItemResponse(
    Guid VariantId,
    string ProductSlug,
    string ProductName,
    string VariantName,
    string Sku,
    decimal UnitPrice,
    int Quantity,
    decimal LineTotal);

public sealed record OrderAddressResponse(
    string RecipientName,
    string Phone,
    string Department,
    string Province,
    string District,
    string AddressLine,
    string? Reference);

public sealed record OrderResponse(
    string OrderNumber,
    string Status,
    DateTimeOffset CreatedAt,
    DateTimeOffset? PaidAt,
    IReadOnlyList<OrderItemResponse> Items,
    OrderAddressResponse ShippingAddress,
    string ShippingMethod,
    decimal ShippingCost,
    decimal Subtotal,
    decimal Total,
    decimal TaxRate,
    decimal TaxableAmount,
    decimal TaxAmount,
    string Currency);

public sealed record OrderSummaryResponse(
    string OrderNumber,
    string Status,
    DateTimeOffset CreatedAt,
    int ItemCount,
    decimal Total,
    string Currency);

public interface IOrderQueries
{
    Task<IReadOnlyList<OrderSummaryResponse>> ListForUserAsync(Guid userId, CancellationToken cancellationToken);

    /// <summary>Returns null both when the order does not exist and when it belongs to another user.</summary>
    Task<OrderResponse?> GetForUserAsync(Guid userId, string orderNumber, CancellationToken cancellationToken);
}
