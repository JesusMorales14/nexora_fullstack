using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;
using Nexora.Api.Common;
using Nexora.Application.Checkout;
using Nexora.Application.Orders;

namespace Nexora.Api.Orders;

public sealed class SimulatedPaymentRequest
{
    public bool Approved { get; init; }
}

[ApiController]
[Route("api/v1/orders")]
[Authorize]
public sealed class OrdersController(
    IOrderQueries orders,
    ICheckoutService checkout,
    IOptions<PaymentOptions> paymentOptions) : ControllerBase
{
    [HttpGet]
    [ProducesResponseType<IReadOnlyList<OrderSummaryResponse>>(StatusCodes.Status200OK, "application/json")]
    public async Task<IReadOnlyList<OrderSummaryResponse>> ListAsync(CancellationToken cancellationToken) =>
        await orders.ListForUserAsync(User.GetRequiredUserId(), cancellationToken);

    /// <summary>404 also for orders of other customers: their existence is not revealed.</summary>
    [HttpGet("{orderNumber}")]
    [ProducesResponseType<OrderResponse>(StatusCodes.Status200OK, "application/json")]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound, "application/problem+json")]
    public async Task<IActionResult> GetAsync(string orderNumber, CancellationToken cancellationToken)
    {
        var order = await orders.GetForUserAsync(User.GetRequiredUserId(), orderNumber, cancellationToken);
        return order is null ? OrderNotFound(orderNumber) : Ok(order);
    }

    /// <summary>
    /// Test-mode payment: approves or rejects the order's payment as a real provider's webhook
    /// would. Only exists while the simulated provider is configured.
    /// </summary>
    [HttpPost("{orderNumber}/simulated-payment")]
    [ProducesResponseType<OrderResponse>(StatusCodes.Status200OK, "application/json")]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound, "application/problem+json")]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status409Conflict, "application/problem+json")]
    public async Task<IActionResult> SimulatePaymentAsync(
        string orderNumber,
        SimulatedPaymentRequest request,
        CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);

        if (!paymentOptions.Value.IsFakeProvider)
        {
            return NotFound();
        }

        var userId = User.GetRequiredUserId();
        var paymentReference = $"SIM-{Guid.CreateVersion7():N}";
        var outcome = await checkout.ConfirmPaymentAsync(userId, orderNumber, request.Approved, paymentReference, cancellationToken);

        return outcome switch
        {
            PaymentConfirmationOutcome.NotFound => OrderNotFound(orderNumber),
            PaymentConfirmationOutcome.Expired => Problem(
                statusCode: StatusCodes.Status409Conflict,
                title: "Payment window expired",
                detail: "El tiempo para pagar este pedido terminó y los productos se liberaron. Vuelve a realizar la compra."),
            PaymentConfirmationOutcome.NotPending => Problem(
                statusCode: StatusCodes.Status409Conflict,
                title: "Order is not awaiting payment",
                detail: "Este pedido ya no está pendiente de pago."),
            _ => Ok(await orders.GetForUserAsync(userId, orderNumber, cancellationToken)),
        };
    }

    private ObjectResult OrderNotFound(string orderNumber) =>
        Problem(statusCode: StatusCodes.Status404NotFound, title: "Order not found", detail: $"No encontramos el pedido {orderNumber}.");
}
