using Nexora.Domain.Common;
using Nexora.Domain.Ordering;

namespace Nexora.UnitTests.Ordering;

public sealed class OrderTests
{
    private const decimal IgvRate = 0.18m;
    private static readonly DateTimeOffset Now = new(2026, 11, 3, 12, 0, 0, TimeSpan.Zero);
    private static readonly ShippingQuote LimaShipping = new("lima", "Lima Metropolitana", 15m, "1 a 2 días");

    private static ShippingAddress Address() =>
        new("Ana Pérez", "987654321", "Lima", "Lima", "Miraflores", "Av. Larco 123", reference: null);

    private static OrderLine Line(decimal unitPrice, int quantity, Guid? variantId = null) =>
        new(variantId ?? Guid.NewGuid(), "producto", "Producto", "Base", "SKU-1", unitPrice, quantity);

    private static Order CreateOrder(params OrderLine[] lines) =>
        Order.Create(Guid.NewGuid(), Guid.NewGuid(), Address(), LimaShipping, lines, IgvRate, Now);

    [Fact]
    public void TotalsAreComputedFromLinesAndShipping()
    {
        var order = CreateOrder(Line(449m, 2), Line(159m, 1));

        Assert.Equal(1057m, order.Subtotal);
        Assert.Equal(15m, order.ShippingCost);
        Assert.Equal(1072m, order.Total);
        Assert.Equal(order.Total, order.TaxableAmount + order.TaxAmount);
        Assert.Equal(OrderStatus.PendingPayment, order.Status);
        Assert.Matches("^NX-[0-9A-HJKMNP-TV-Z]{8}$", order.OrderNumber);
    }

    [Fact]
    public void EmptyOrdersAreRejected()
    {
        Assert.Throws<DomainException>(() => CreateOrder());
    }

    [Fact]
    public void DuplicateVariantsAreRejected()
    {
        var variantId = Guid.NewGuid();

        Assert.Throws<DomainException>(() => CreateOrder(Line(100m, 1, variantId), Line(100m, 2, variantId)));
    }

    [Theory]
    [InlineData(0)]
    [InlineData(11)]
    public void QuantitiesOutsideTheAllowedRangeAreRejected(int quantity)
    {
        Assert.Throws<DomainException>(() => CreateOrder(Line(100m, quantity)));
    }

    [Fact]
    public void PaidOrdersCannotBePaidOrCancelledAgain()
    {
        var order = CreateOrder(Line(100m, 1));
        order.MarkPaid("SIM-1", Now);

        Assert.Equal(OrderStatus.Paid, order.Status);
        Assert.Equal(Now, order.PaidAt);
        Assert.Throws<DomainException>(() => order.MarkPaid("SIM-2", Now));
        Assert.Throws<DomainException>(() => order.Cancel(Now));
    }

    [Fact]
    public void FailedPaymentClosesTheOrder()
    {
        var order = CreateOrder(Line(100m, 1));

        order.MarkPaymentFailed(Now);

        Assert.Equal(OrderStatus.PaymentFailed, order.Status);
        Assert.Throws<DomainException>(() => order.MarkPaid("SIM-1", Now));
    }
}
