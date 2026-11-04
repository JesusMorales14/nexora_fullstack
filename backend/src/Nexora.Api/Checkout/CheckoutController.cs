using FluentValidation;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Nexora.Api.Common;
using Nexora.Application.Checkout;

namespace Nexora.Api.Checkout;

[ApiController]
[Route("api/v1/checkout")]
[Authorize]
public sealed class CheckoutController(ICheckoutService checkout, IValidator<CheckoutRequest> validator) : ControllerBase
{
    public const string IdempotencyKeyHeader = "Idempotency-Key";

    /// <summary>
    /// Places an order. The Idempotency-Key header (a UUID generated once per checkout attempt)
    /// makes retries safe: repeating the request returns the same order instead of a duplicate.
    /// </summary>
    [HttpPost]
    [ProducesResponseType<CheckoutResponse>(StatusCodes.Status201Created, "application/json")]
    [ProducesResponseType<CheckoutResponse>(StatusCodes.Status200OK, "application/json")]
    [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest, "application/problem+json")]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status409Conflict, "application/problem+json")]
    public async Task<IActionResult> PlaceOrderAsync(
        CheckoutRequest request,
        [FromHeader(Name = IdempotencyKeyHeader)] string? idempotencyKey,
        CancellationToken cancellationToken)
    {
        if (!Guid.TryParse(idempotencyKey, out var key) || key == Guid.Empty)
        {
            return Problem(
                statusCode: StatusCodes.Status400BadRequest,
                title: "Missing idempotency key",
                detail: $"Send a UUID in the {IdempotencyKeyHeader} header.");
        }

        var validation = await validator.ValidateAsync(request, cancellationToken);
        if (!validation.IsValid)
        {
            return this.ToValidationProblem(validation);
        }

        var result = await checkout.PlaceOrderAsync(User.GetRequiredUserId(), key, request, cancellationToken);

        return result.Outcome switch
        {
            CheckoutOutcome.Placed => Created($"/api/v1/orders/{result.Response!.Order.OrderNumber}", result.Response),
            CheckoutOutcome.Replayed => Ok(result.Response),
            CheckoutOutcome.Unavailable => ConflictProblem(
                "Product unavailable",
                "Algunos productos ya no están disponibles. Revisa tu carrito.",
                result.ProblemSkus),
            CheckoutOutcome.OutOfStock => ConflictProblem(
                "Insufficient stock",
                "No hay stock suficiente para algunos productos. Revisa las cantidades de tu carrito.",
                result.ProblemSkus),
            _ => throw new InvalidOperationException($"Unhandled checkout outcome {result.Outcome}."),
        };
    }

    private ObjectResult ConflictProblem(string title, string detail, IReadOnlyList<string> items)
    {
        var problem = ProblemDetailsFactory.CreateProblemDetails(HttpContext, StatusCodes.Status409Conflict, title, detail: detail);
        problem.Extensions["items"] = items;
        return new ObjectResult(problem) { StatusCode = StatusCodes.Status409Conflict, ContentTypes = { "application/problem+json" } };
    }
}
