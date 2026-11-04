namespace Nexora.Application.Checkout;

/// <summary>Business settings in configuration so rates can change without a deploy of new code.</summary>
public sealed class ShippingOptions
{
    public const string SectionName = "Shipping";

    /// <summary>Orders whose subtotal (IGV included) reaches this amount ship for free.</summary>
    public decimal FreeShippingThreshold { get; init; } = 500m;

    /// <summary>Departments served by the metropolitan rate.</summary>
    public string[] MetropolitanDepartments { get; init; } = ["Lima", "Callao"];

    public ShippingRate Metropolitan { get; init; } = new() { Code = "lima", Label = "Lima Metropolitana y Callao", Cost = 15m, EstimatedDelivery = "1 a 2 días hábiles" };

    public ShippingRate Provinces { get; init; } = new() { Code = "provincias", Label = "Provincias", Cost = 25m, EstimatedDelivery = "3 a 5 días hábiles" };
}

public sealed class ShippingRate
{
    public string Code { get; init; } = string.Empty;

    public string Label { get; init; } = string.Empty;

    public decimal Cost { get; init; }

    public string EstimatedDelivery { get; init; } = string.Empty;
}

public sealed class TaxOptions
{
    public const string SectionName = "Tax";

    /// <summary>IGV 16% + IPM 2%. Verify the current rate with SUNAT (ADR-0002).</summary>
    public decimal IgvRate { get; init; } = 0.18m;
}

public sealed class PaymentOptions
{
    public const string SectionName = "Payments";
    public const string FakeProvider = "Fake";

    public string Provider { get; init; } = FakeProvider;

    /// <summary>Unpaid orders release their stock reservation after this time.</summary>
    public int PendingPaymentTimeoutMinutes { get; init; } = 30;

    public bool ExpirationSweepEnabled { get; init; } = true;

    public int ExpirationSweepIntervalSeconds { get; init; } = 60;

    public bool IsFakeProvider => string.Equals(Provider, FakeProvider, StringComparison.OrdinalIgnoreCase);
}
