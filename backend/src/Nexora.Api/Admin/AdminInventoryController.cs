using FluentValidation;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Nexora.Api.Auth;
using Nexora.Api.Common;
using Nexora.Application.Admin;
using Nexora.Application.Common;
using Nexora.Infrastructure.Admin;

namespace Nexora.Api.Admin;

[ApiController]
[Route("api/v1/admin")]
[Authorize(Policy = AuthSetup.AdminPolicy)]
public sealed class AdminInventoryController(
    IAdminInventoryService inventory,
    IAuditLogQueries auditLog,
    IValidator<InventoryAdjustmentRequest> adjustmentValidator) : ControllerBase
{
    [HttpGet("inventory")]
    [ProducesResponseType<PagedResponse<InventoryItemResponse>>(StatusCodes.Status200OK, "application/json")]
    public async Task<PagedResponse<InventoryItemResponse>> ListAsync([FromQuery] AdminInventoryListRequest request, CancellationToken cancellationToken) =>
        await inventory.ListAsync(request, cancellationToken);

    /// <summary>Adds or removes on-hand units with a reason; recorded in the movement ledger and audit log.</summary>
    [HttpPost("inventory/{variantId:guid}/adjustments")]
    [ProducesResponseType<InventoryItemResponse>(StatusCodes.Status200OK, "application/json")]
    [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest, "application/problem+json")]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status409Conflict, "application/problem+json")]
    public async Task<IActionResult> AdjustAsync(Guid variantId, InventoryAdjustmentRequest request, CancellationToken cancellationToken)
    {
        var validation = await adjustmentValidator.ValidateAsync(request, cancellationToken);
        if (!validation.IsValid)
        {
            return this.ToValidationProblem(validation);
        }

        return this.ToActionResult(await inventory.AdjustAsync(variantId, request, cancellationToken), Ok);
    }

    [HttpGet("inventory/{variantId:guid}/movements")]
    [ProducesResponseType<IReadOnlyList<InventoryMovementResponse>>(StatusCodes.Status200OK, "application/json")]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound, "application/problem+json")]
    public async Task<IActionResult> ListMovementsAsync(Guid variantId, CancellationToken cancellationToken) =>
        await inventory.ListMovementsAsync(variantId, cancellationToken) is { } movements
            ? Ok(movements)
            : Problem(statusCode: StatusCodes.Status404NotFound, title: "Not found", detail: "La variante no existe.");

    [HttpGet("audit-log")]
    [ProducesResponseType<PagedResponse<AuditLogEntryResponse>>(StatusCodes.Status200OK, "application/json")]
    public async Task<PagedResponse<AuditLogEntryResponse>> ListAuditLogAsync(int? page, int? pageSize, CancellationToken cancellationToken)
    {
        var (normalizedPage, normalizedPageSize) = Paging.Normalize(page, pageSize);
        return await auditLog.ListAsync(normalizedPage, normalizedPageSize, cancellationToken);
    }
}
