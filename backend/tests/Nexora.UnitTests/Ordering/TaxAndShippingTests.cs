using Nexora.Application.Checkout;
using Nexora.Domain.Ordering;

namespace Nexora.UnitTests.Ordering;

public sealed class TaxAndShippingTests
{
    [Theory]
    [InlineData(118.00, 100.00, 18.00)]
    [InlineData(1299.00, 1100.85, 198.15)]
    [InlineData(159.00, 134.75, 24.25)]
    [InlineData(0.01, 0.01, 0.00)]
    [InlineData(0, 0, 0)]
    public void IgvBreakdownAddsUpToTheGrossAmount(decimal gross, decimal expectedTaxable, decimal expectedTax)
    {
        var tax = TaxBreakdown.FromGross(gross, 0.18m);

        Assert.Equal(expectedTaxable, tax.TaxableAmount);
        Assert.Equal(expectedTax, tax.TaxAmount);
        Assert.Equal(gross, tax.TaxableAmount + tax.TaxAmount);
    }

    private static readonly ShippingOptions Options = new();

    [Theory]
    [InlineData("Lima", "lima", 15)]
    [InlineData("Callao", "lima", 15)]
    [InlineData("Arequipa", "provincias", 25)]
    [InlineData("Cusco", "provincias", 25)]
    public void ShippingRateDependsOnTheDepartment(string department, string expectedCode, decimal expectedCost)
    {
        var quote = ShippingCalculator.Quote(department, 100m, Options);

        Assert.Equal(expectedCode, quote.Code);
        Assert.Equal(expectedCost, quote.Cost);
    }

    [Theory]
    [InlineData(499.99, 25)]
    [InlineData(500.00, 0)]
    public void ShippingIsFreeFromTheThreshold(decimal subtotal, decimal expectedCost)
    {
        Assert.Equal(expectedCost, ShippingCalculator.Quote("Piura", subtotal, Options).Cost);
    }
}
