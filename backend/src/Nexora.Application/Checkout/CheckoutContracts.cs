using Nexora.Application.Catalog;
using Nexora.Application.Orders;

namespace Nexora.Application.Checkout;

// Requests carry only identifiers and quantities. Prices, stock, shipping and taxes are always
// computed by the server from the database (never trusted from the client).

public sealed class CartItemRequest
{
    public Guid VariantId { get; init; }

    public int Quantity { get; init; }
}

public sealed class CartQuoteRequest
{
    public IReadOnlyList<CartItemRequest> Items { get; init; } = [];

    /// <summary>Optional: when present the quote includes shipping.</summary>
    public string? Department { get; init; }
}

public sealed class ShippingAddressRequest
{
    public string RecipientName { get; init; } = string.Empty;

    public string Phone { get; init; } = string.Empty;

    public string Department { get; init; } = string.Empty;

    public string Province { get; init; } = string.Empty;

    public string District { get; init; } = string.Empty;

    public string AddressLine { get; init; } = string.Empty;

    public string? Reference { get; init; }
}

public sealed class CheckoutRequest
{
    public IReadOnlyList<CartItemRequest> Items { get; init; } = [];

    public ShippingAddressRequest ShippingAddress { get; init; } = new();
}

public sealed record CartLineResponse(
    Guid VariantId,
    string ProductSlug,
    string ProductName,
    string VariantName,
    string Sku,
    ProductImageResponse? Image,
    decimal UnitPrice,
    decimal? CompareAtPrice,
    int Quantity,
    decimal LineTotal,
    bool IsAvailable,
    int MaxQuantity);

public sealed record ShippingQuoteResponse(string Code, string Label, decimal Cost, string EstimatedDelivery);

public sealed record TaxResponse(decimal Rate, decimal TaxableAmount, decimal TaxAmount);

public sealed record CartQuoteResponse(
    IReadOnlyList<CartLineResponse> Lines,
    IReadOnlyList<Guid> UnavailableVariantIds,
    decimal Subtotal,
    ShippingQuoteResponse? Shipping,
    decimal FreeShippingThreshold,
    decimal Total,
    TaxResponse Tax,
    string Currency,
    bool CanCheckout);

/// <summary>
/// PaymentUrl is site-relative for the simulated gateway ("/checkout/pay/NX-...") and absolute
/// for a real provider's hosted checkout.
/// </summary>
public sealed record CheckoutResponse(OrderResponse Order, string PaymentUrl);
