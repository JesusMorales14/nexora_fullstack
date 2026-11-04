using System.Security.Claims;

namespace Nexora.Api.Common;

public static class UserExtensions
{
    /// <summary>The authenticated user's id from the session cookie's claims.</summary>
    public static Guid GetRequiredUserId(this ClaimsPrincipal user)
    {
        ArgumentNullException.ThrowIfNull(user);

        var value = user.FindFirstValue(ClaimTypes.NameIdentifier);
        return Guid.TryParse(value, out var userId)
            ? userId
            : throw new InvalidOperationException("Authenticated user has no valid id claim.");
    }
}
