using FluentValidation;
using Microsoft.AspNetCore.Mvc;
using Nexora.Api.Common;
using Nexora.Application.Checkout;

namespace Nexora.Api.Checkout;

[ApiController]
[Route("api/v1/cart")]
public sealed class CartController(ICheckoutService checkout, IValidator<CartQuoteRequest> validator) : ControllerBase
{
    /// <summary>
    /// Prices a cart with current prices, stock and (optionally) shipping. The browser cart only
    /// stores variant ids and quantities; every amount the customer sees comes from here.
    /// </summary>
    [HttpPost("quote")]
    [ProducesResponseType<CartQuoteResponse>(StatusCodes.Status200OK, "application/json")]
    [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest, "application/problem+json")]
    public async Task<IActionResult> QuoteAsync(CartQuoteRequest request, CancellationToken cancellationToken)
    {
        var validation = await validator.ValidateAsync(request, cancellationToken);
        if (!validation.IsValid)
        {
            return this.ToValidationProblem(validation);
        }

        return Ok(await checkout.QuoteAsync(request, cancellationToken));
    }
}
