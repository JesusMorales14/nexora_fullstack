using System.Security.Cryptography;
using Nexora.Domain.Common;

namespace Nexora.Domain.Ordering;

public sealed class Order
{
    public const int OrderNumberLength = 11;
    public const int ShippingCodeMaxLength = 30;
    public const int ShippingLabelMaxLength = 80;
    public const int PaymentReferenceMaxLength = 120;

    // Crockford base32 without I, L, O, U: easy to read aloud and type from an email.
    private const string OrderNumberAlphabet = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
    private const int OrderNumberRandomLength = 8;

    private readonly List<OrderItem> _items = [];

    // Required by EF Core for materialization.
    private Order()
    {
        OrderNumber = null!;
        ShippingAddress = null!;
        ShippingMethodCode = null!;
        ShippingMethodLabel = null!;
    }

    public Guid Id { get; private set; }

    /// <summary>Public identifier shown to the customer, e.g. "NX-7K3M9Q2A". Not guessable.</summary>
    public string OrderNumber { get; private set; }

    public Guid UserId { get; private set; }

    /// <summary>Client-generated key: retrying the same checkout returns this order instead of a duplicate.</summary>
    public Guid IdempotencyKey { get; private set; }

    public OrderStatus Status { get; private set; }

    public ShippingAddress ShippingAddress { get; private set; }

    public string ShippingMethodCode { get; private set; }

    public string ShippingMethodLabel { get; private set; }

    public decimal ShippingCost { get; private set; }

    /// <summary>Sum of line totals, IGV included.</summary>
    public decimal Subtotal { get; private set; }

    public decimal Total { get; private set; }

    public decimal TaxRate { get; private set; }

    public decimal TaxableAmount { get; private set; }

    public decimal TaxAmount { get; private set; }

    public string? PaymentReference { get; private set; }

    public DateTimeOffset CreatedAt { get; private set; }

    public DateTimeOffset? PaidAt { get; private set; }

    public DateTimeOffset? ShippedAt { get; private set; }

    public DateTimeOffset? ClosedAt { get; private set; }

    public IReadOnlyList<OrderItem> Items => _items;

    public static Order Create(
        Guid userId,
        Guid idempotencyKey,
        ShippingAddress shippingAddress,
        ShippingQuote shipping,
        IReadOnlyCollection<OrderLine> lines,
        decimal taxRate,
        DateTimeOffset now)
    {
        ArgumentNullException.ThrowIfNull(shippingAddress);
        ArgumentNullException.ThrowIfNull(lines);

        if (lines.Count == 0)
        {
            throw new DomainException("An order needs at least one item.");
        }

        if (lines.Select(line => line.VariantId).Distinct().Count() != lines.Count)
        {
            throw new DomainException("Each variant can appear only once per order.");
        }

        if (shipping.Cost < 0)
        {
            throw new DomainException("Shipping cost cannot be negative.");
        }

        var order = new Order
        {
            Id = Guid.CreateVersion7(),
            OrderNumber = GenerateOrderNumber(),
            UserId = userId,
            IdempotencyKey = idempotencyKey,
            Status = OrderStatus.PendingPayment,
            ShippingAddress = shippingAddress,
            ShippingMethodCode = Guard.RequiredText(shipping.Code, ShippingCodeMaxLength, "Shipping code"),
            ShippingMethodLabel = Guard.RequiredText(shipping.Label, ShippingLabelMaxLength, "Shipping label"),
            ShippingCost = shipping.Cost,
            CreatedAt = now,
        };

        foreach (var line in lines)
        {
            order._items.Add(new OrderItem(
                order.Id, line.VariantId, line.ProductSlug, line.ProductName, line.VariantName, line.Sku, line.UnitPrice, line.Quantity));
        }

        order.Subtotal = order._items.Sum(item => item.LineTotal);
        order.Total = order.Subtotal + order.ShippingCost;

        var tax = TaxBreakdown.FromGross(order.Total, taxRate);
        order.TaxRate = tax.Rate;
        order.TaxableAmount = tax.TaxableAmount;
        order.TaxAmount = tax.TaxAmount;

        return order;
    }

    public void MarkPaid(string paymentReference, DateTimeOffset now)
    {
        EnsureStatus(OrderStatus.PendingPayment, "pay");
        PaymentReference = Guard.RequiredText(paymentReference, PaymentReferenceMaxLength, "Payment reference");
        Status = OrderStatus.Paid;
        PaidAt = now;
    }

    public void MarkPaymentFailed(DateTimeOffset now)
    {
        EnsureStatus(OrderStatus.PendingPayment, "fail the payment of");
        Status = OrderStatus.PaymentFailed;
        ClosedAt = now;
    }

    /// <summary>Cancels an unpaid order (manually or because its payment window expired).</summary>
    public void Cancel(DateTimeOffset now)
    {
        EnsureStatus(OrderStatus.PendingPayment, "cancel");
        Status = OrderStatus.Cancelled;
        ClosedAt = now;
    }

    public void MarkShipped(DateTimeOffset now)
    {
        EnsureStatus(OrderStatus.Paid, "ship");
        Status = OrderStatus.Shipped;
        ShippedAt = now;
    }

    public void MarkDelivered(DateTimeOffset now)
    {
        EnsureStatus(OrderStatus.Shipped, "deliver");
        Status = OrderStatus.Delivered;
        ClosedAt = now;
    }

    private void EnsureStatus(OrderStatus expected, string action)
    {
        if (Status != expected)
        {
            throw new DomainException($"Cannot {action} order {OrderNumber} in status {Status}.");
        }
    }

    private static string GenerateOrderNumber() =>
        "NX-" + RandomNumberGenerator.GetString(OrderNumberAlphabet, OrderNumberRandomLength);
}

/// <summary>A priced line as validated by checkout (prices come from the database, never from the client).</summary>
public sealed record OrderLine(
    Guid VariantId,
    string ProductSlug,
    string ProductName,
    string VariantName,
    string Sku,
    decimal UnitPrice,
    int Quantity);

public readonly record struct ShippingQuote(string Code, string Label, decimal Cost, string EstimatedDelivery);
