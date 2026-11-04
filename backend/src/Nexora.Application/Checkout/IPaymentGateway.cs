namespace Nexora.Application.Checkout;

/// <summary>
/// Seam for the payment provider. The simulated gateway is used today; a Mercado Pago
/// implementation can replace it without touching checkout or orders.
/// </summary>
public interface IPaymentGateway
{
    /// <summary>Starts a payment for the order and returns where the customer must go to pay.</summary>
    Task<string> CreatePaymentUrlAsync(string orderNumber, decimal amount, CancellationToken cancellationToken);
}
