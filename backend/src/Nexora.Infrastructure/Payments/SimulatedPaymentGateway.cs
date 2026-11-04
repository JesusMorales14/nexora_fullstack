using Nexora.Application.Checkout;

namespace Nexora.Infrastructure.Payments;

/// <summary>
/// Test-mode gateway: sends the customer to the storefront's simulated payment page, where the
/// payment is approved or rejected through POST /orders/{number}/simulated-payment.
/// No real money and no card data are involved.
/// </summary>
internal sealed class SimulatedPaymentGateway : IPaymentGateway
{
    public Task<string> CreatePaymentUrlAsync(string orderNumber, decimal amount, CancellationToken cancellationToken) =>
        Task.FromResult($"/checkout/pay/{Uri.EscapeDataString(orderNumber)}");
}
