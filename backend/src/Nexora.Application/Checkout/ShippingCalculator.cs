using Nexora.Domain.Ordering;

namespace Nexora.Application.Checkout;

/// <summary>
/// The shipping method is derived from the destination, not chosen by the client, so the client
/// cannot pick the cheaper rate for a farther address.
/// </summary>
public static class ShippingCalculator
{
    public static ShippingQuote Quote(string department, decimal subtotal, ShippingOptions options)
    {
        ArgumentNullException.ThrowIfNull(options);

        var rate = options.MetropolitanDepartments.Contains(department, StringComparer.Ordinal)
            ? options.Metropolitan
            : options.Provinces;

        var cost = subtotal >= options.FreeShippingThreshold ? 0m : rate.Cost;
        return new ShippingQuote(rate.Code, rate.Label, cost, rate.EstimatedDelivery);
    }
}
