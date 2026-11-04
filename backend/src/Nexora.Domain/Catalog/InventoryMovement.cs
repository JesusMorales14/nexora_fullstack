using Nexora.Domain.Common;

namespace Nexora.Domain.Catalog;

public enum InventoryMovementReason
{
    /// <summary>Goods received from a supplier.</summary>
    Restock = 0,

    /// <summary>Physical count did not match the system.</summary>
    Correction = 1,

    /// <summary>Damaged or lost units written off.</summary>
    Damage = 2,

    /// <summary>Customer return put back on sale.</summary>
    Return = 3,

    /// <summary>Units sold through a paid order (recorded by checkout).</summary>
    Sale = 4,
}

/// <summary>
/// Append-only ledger of every change to on-hand stock: the current quantity can always be
/// explained (who, when, why), which the admin needs for audits and stock disputes.
/// </summary>
public sealed class InventoryMovement
{
    public const int NoteMaxLength = 300;

    // Required by EF Core for materialization.
    private InventoryMovement()
    {
    }

    public InventoryMovement(
        Guid variantId,
        int quantityChange,
        InventoryMovementReason reason,
        string? note,
        Guid? actorUserId,
        string? reference,
        DateTimeOffset now)
    {
        if (quantityChange == 0)
        {
            throw new DomainException("An inventory movement must change the quantity.");
        }

        Id = Guid.CreateVersion7();
        VariantId = variantId;
        QuantityChange = quantityChange;
        Reason = reason;
        Note = string.IsNullOrWhiteSpace(note) ? null : Guard.RequiredText(note, NoteMaxLength, "Note");
        ActorUserId = actorUserId;
        Reference = reference;
        CreatedAt = now;
    }

    public Guid Id { get; private set; }

    public Guid VariantId { get; private set; }

    /// <summary>Positive adds units, negative removes them.</summary>
    public int QuantityChange { get; private set; }

    public InventoryMovementReason Reason { get; private set; }

    public string? Note { get; private set; }

    /// <summary>The admin who made the change; null for system movements.</summary>
    public Guid? ActorUserId { get; private set; }

    /// <summary>E.g. the order number for sales.</summary>
    public string? Reference { get; private set; }

    public DateTimeOffset CreatedAt { get; private set; }
}
