using System.Globalization;
using System.Text;
using FluentValidation;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Nexora.Api.Auth;
using Nexora.Api.Common;
using Nexora.Application.Admin;
using Nexora.Application.Common;

namespace Nexora.Api.Admin;

[ApiController]
[Route("api/v1/admin")]
[Authorize(Policy = AuthSetup.AdminPolicy)]
public sealed class AdminOperationsController(
    IAdminOperationsService operations,
    IValidator<OrderStatusChangeRequest> statusValidator,
    IValidator<GrantAdministratorRequest> grantValidator,
    TimeProvider timeProvider) : ControllerBase
{
    private const int DefaultReportDays = 30;
    private const int MaxReportDays = 366;

    [HttpGet("orders")]
    [ProducesResponseType<PagedResponse<AdminOrderListItem>>(StatusCodes.Status200OK, "application/json")]
    public async Task<PagedResponse<AdminOrderListItem>> ListOrdersAsync([FromQuery] AdminOrderListRequest request, CancellationToken cancellationToken) =>
        await operations.ListOrdersAsync(request, cancellationToken);

    [HttpGet("orders/{orderNumber}")]
    [ProducesResponseType<AdminOrderDetails>(StatusCodes.Status200OK, "application/json")]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound, "application/problem+json")]
    public async Task<IActionResult> GetOrderAsync(string orderNumber, CancellationToken cancellationToken) =>
        await operations.GetOrderAsync(orderNumber, cancellationToken) is { } order
            ? Ok(order)
            : Problem(statusCode: StatusCodes.Status404NotFound, title: "Not found", detail: "El pedido no existe.");

    [HttpPost("orders/{orderNumber}/status")]
    [ProducesResponseType<AdminOrderDetails>(StatusCodes.Status200OK, "application/json")]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status409Conflict, "application/problem+json")]
    public async Task<IActionResult> ChangeOrderStatusAsync(string orderNumber, OrderStatusChangeRequest request, CancellationToken cancellationToken)
    {
        var validation = await statusValidator.ValidateAsync(request, cancellationToken);
        if (!validation.IsValid)
        {
            return this.ToValidationProblem(validation);
        }

        return this.ToActionResult(await operations.ChangeOrderStatusAsync(orderNumber, request.Status, cancellationToken), Ok);
    }

    [HttpGet("customers")]
    [ProducesResponseType<PagedResponse<AdminCustomerListItem>>(StatusCodes.Status200OK, "application/json")]
    public async Task<PagedResponse<AdminCustomerListItem>> ListCustomersAsync([FromQuery] AdminCustomerListRequest request, CancellationToken cancellationToken) =>
        await operations.ListCustomersAsync(request, cancellationToken);

    /// <summary>Orders CSV for a Lima date range (inclusive). Defaults to the last 30 days; max one year.</summary>
    [HttpGet("reports/orders.csv")]
    [Produces("text/csv")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status400BadRequest, "application/problem+json")]
    public async Task<IActionResult> ExportOrdersAsync(DateOnly? from, DateOnly? to, CancellationToken cancellationToken)
    {
        var today = DateOnly.FromDateTime(timeProvider.GetUtcNow().UtcDateTime);
        var lastDay = to ?? today;
        var firstDay = from ?? lastDay.AddDays(-DefaultReportDays);

        if (firstDay > lastDay || lastDay.DayNumber - firstDay.DayNumber > MaxReportDays)
        {
            return Problem(
                statusCode: StatusCodes.Status400BadRequest,
                title: "Invalid range",
                detail: $"El rango debe ser válido y de como máximo {MaxReportDays} días.");
        }

        var csv = await operations.ExportOrdersCsvAsync(firstDay, lastDay.AddDays(1), cancellationToken);
        var fileName = string.Create(CultureInfo.InvariantCulture, $"pedidos-{firstDay:yyyy-MM-dd}-a-{lastDay:yyyy-MM-dd}.csv");

        // UTF-8 with BOM so Excel shows accents (Envío, Perú) correctly.
        return File(Encoding.UTF8.GetPreamble().Concat(Encoding.UTF8.GetBytes(csv)).ToArray(), "text/csv; charset=utf-8", fileName);
    }

    [HttpGet("administrators")]
    [ProducesResponseType<IReadOnlyList<AdministratorResponse>>(StatusCodes.Status200OK, "application/json")]
    public async Task<IReadOnlyList<AdministratorResponse>> ListAdministratorsAsync(CancellationToken cancellationToken) =>
        await operations.ListAdministratorsAsync(cancellationToken);

    [HttpPost("administrators")]
    [ProducesResponseType<AdministratorResponse>(StatusCodes.Status200OK, "application/json")]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status409Conflict, "application/problem+json")]
    public async Task<IActionResult> GrantAdministratorAsync(GrantAdministratorRequest request, CancellationToken cancellationToken)
    {
        var validation = await grantValidator.ValidateAsync(request, cancellationToken);
        if (!validation.IsValid)
        {
            return this.ToValidationProblem(validation);
        }

        return this.ToActionResult(await operations.GrantAdministratorAsync(request.Email, cancellationToken), Ok);
    }

    [HttpDelete("administrators/{userId:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status409Conflict, "application/problem+json")]
    public async Task<IActionResult> RevokeAdministratorAsync(Guid userId, CancellationToken cancellationToken) =>
        this.ToActionResult(await operations.RevokeAdministratorAsync(userId, cancellationToken), _ => NoContent());
}
