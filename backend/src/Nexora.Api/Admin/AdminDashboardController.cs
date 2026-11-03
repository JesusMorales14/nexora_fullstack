using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Nexora.Api.Auth;
using Nexora.Application.Admin;

namespace Nexora.Api.Admin;

/// <summary>Every admin controller carries the policy at class level: no action is public by accident.</summary>
[ApiController]
[Route("api/v1/admin")]
[Authorize(Policy = AuthSetup.AdminPolicy)]
public sealed class AdminDashboardController(IAdminDashboard dashboard) : ControllerBase
{
    [HttpGet("summary")]
    [ProducesResponseType<AdminSummaryResponse>(StatusCodes.Status200OK, "application/json")]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<AdminSummaryResponse> GetSummaryAsync(CancellationToken cancellationToken) =>
        await dashboard.GetSummaryAsync(cancellationToken);
}
