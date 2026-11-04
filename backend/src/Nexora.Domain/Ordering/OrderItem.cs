using Nexora.Domain.Common;

namespace Nexora.Domain.Ordering;

/// <summary>
/// One purchased variant. Name, SKU and price are copied at checkout time so the order keeps
/// what the customer actually paid even if the catalog changes later.
/// </summary>
public sealed class OrderItem
{
    public const int MaxQuantity = 10;

    // Required by EF Core for materialization.
    private OrderItem()
    {
        ProductName = null!;
        VariantName = null!;
        Sku = null!;
        ProductSlug = null!;
    }

    internal OrderItem(
        Guid orderId,
        Guid variantId,
        string productSlug,
        string productName,
        string variantName,
        string sku,
        decimal unitPrice,
        int quantity)
    {
        if (quantity is < 1 or > MaxQuantity)
        {
            throw new DomainException($"Quantity must be between 1 and {MaxQuantity}.");
        }

        Id = Guid.CreateVersion7();
        OrderId = orderId;
        VariantId = variantId;
        ProductSlug = productSlug;
        ProductName = productName;
        VariantName = variantName;
        Sku = sku;
        UnitPrice = Catalog.Price.EnsureValid(unitPrice, "Unit price");
        Quantity = quantity;
    }

    public Guid Id { get; private set; }

    public Guid OrderId { get; private set; }

    public Guid VariantId { get; private set; }

    public string ProductSlug { get; private set; }

    public string ProductName { get; private set; }

    public string VariantName { get; private set; }

    public string Sku { get; private set; }

    /// <summary>IGV-included unit price at the moment of purchase.</summary>
    public decimal UnitPrice { get; private set; }

    public int Quantity { get; private set; }

    public decimal LineTotal => UnitPrice * Quantity;
}
