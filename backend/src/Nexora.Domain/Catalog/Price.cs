using Nexora.Domain.Common;

namespace Nexora.Domain.Catalog;

/// <summary>
/// Price rules for the store (single currency, PEN). Prices are stored IGV-included,
/// as Peruvian consumer law requires the final price to be displayed (see ADR-0002).
/// </summary>
public static class Price
{
    public const int Precision = 12;
    public const int Scale = 2;

    /// <summary>Business ceiling, far below what numeric(12,2) can store.</summary>
    public const decimal MaxAmount = 1_000_000m;

    public static decimal EnsureValid(decimal amount, string fieldName)
    {
        if (amount <= 0)
        {
            throw new DomainException($"{fieldName} must be greater than zero.");
        }

        if (amount > MaxAmount)
        {
            throw new DomainException($"{fieldName} must not exceed {MaxAmount}.");
        }

        if (decimal.Round(amount, Scale) != amount)
        {
            throw new DomainException($"{fieldName} must have at most {Scale} decimal places (céntimos).");
        }

        return amount;
    }
}
