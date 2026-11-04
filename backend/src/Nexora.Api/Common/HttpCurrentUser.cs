using System.Security.Claims;
using Nexora.Application.Common;

namespace Nexora.Api.Common;

/// <summary>Reads the acting user from the authenticated session (never from the request body).</summary>
public sealed class HttpCurrentUser(IHttpContextAccessor httpContextAccessor) : ICurrentUser
{
    private ClaimsPrincipal User =>
        httpContextAccessor.HttpContext?.User ?? throw new InvalidOperationException("No HTTP context for the current user.");

    public Guid UserId => User.GetRequiredUserId();

    public string Email => User.FindFirstValue(ClaimTypes.Email) ?? User.FindFirstValue(ClaimTypes.Name) ?? string.Empty;
}
