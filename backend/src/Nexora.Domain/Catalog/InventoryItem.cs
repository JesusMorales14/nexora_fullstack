using Nexora.Domain.Common;

namespace Nexora.Domain.Catalog;

/// <summary>
/// Stock for one variant. Kept in its own table so checkout stock updates never contend
/// with admin edits of the catalog row. Decrements will be done with an atomic conditional
/// UPDATE inside the checkout transaction (phase 6).
/// </summary>
public sealed class InventoryItem
{
    public const int DefaultLowStockThreshold = 5;

    // Required by EF Core for materialization.
    private InventoryItem()
    {
    }

    internal InventoryItem(Guid variantId, int onHand, int lowStockThreshold)
    {
        if (onHand < 0)
        {
            throw new DomainException("Stock on hand cannot be negative.");
        }

        if (lowStockThreshold < 0)
        {
            throw new DomainException("Low stock threshold cannot be negative.");
        }

        VariantId = variantId;
        OnHand = onHand;
        LowStockThreshold = lowStockThreshold;
    }

    public Guid VariantId { get; private set; }

    /// <summary>Physical units in the warehouse.</summary>
    public int OnHand { get; private set; }

    /// <summary>Units held by orders that are not yet fulfilled.</summary>
    public int Reserved { get; private set; }

    public int LowStockThreshold { get; private set; }

    public int Available => OnHand - Reserved;

    public bool IsInStock => Available > 0;

    public bool IsLowStock => Available <= LowStockThreshold;
}
