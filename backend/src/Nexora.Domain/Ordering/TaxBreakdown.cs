using Nexora.Domain.Common;

namespace Nexora.Domain.Ordering;

/// <summary>
/// Splits an IGV-included amount into taxable base and IGV (ADR-0002).
/// The base is rounded to céntimos (away from zero) and the IGV is the remainder, so
/// base + IGV always equals the gross amount exactly.
/// </summary>
public readonly record struct TaxBreakdown(decimal GrossAmount, decimal TaxableAmount, decimal TaxAmount, decimal Rate)
{
    public static TaxBreakdown FromGross(decimal grossAmount, decimal rate)
    {
        if (grossAmount < 0)
        {
            throw new DomainException("Gross amount cannot be negative.");
        }

        if (rate is < 0 or >= 1)
        {
            throw new DomainException("Tax rate must be between 0 and 1.");
        }

        var taxable = decimal.Round(grossAmount / (1 + rate), 2, MidpointRounding.AwayFromZero);
        return new TaxBreakdown(grossAmount, taxable, grossAmount - taxable, rate);
    }
}
