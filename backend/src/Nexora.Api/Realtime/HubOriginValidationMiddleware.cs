using Microsoft.Extensions.Options;
using Nexora.Api.Configuration;

namespace Nexora.Api.Realtime;

/// <summary>
/// Defense against cross-site WebSocket hijacking: browsers send cookies on WebSocket handshakes and
/// CORS does not apply to them, so connections to the hubs must come from the API's own origin or
/// from an explicitly allowed storefront origin. (SameSite=Lax cookies already block most cases.)
/// </summary>
internal sealed class HubOriginValidationMiddleware(RequestDelegate next, IOptions<FrontendOptions> frontendOptions)
{
    public Task InvokeAsync(HttpContext context)
    {
        if (!context.Request.Path.StartsWithSegments("/hubs", StringComparison.OrdinalIgnoreCase))
        {
            return next(context);
        }

        var origin = context.Request.Headers.Origin.ToString();
        if (string.IsNullOrEmpty(origin) || IsAllowed(origin, context.Request))
        {
            // Non-browser clients (tests, tools) send no Origin; they still need a valid session cookie.
            return next(context);
        }

        context.Response.StatusCode = StatusCodes.Status403Forbidden;
        return Task.CompletedTask;
    }

    private bool IsAllowed(string origin, HttpRequest request)
    {
        if (!Uri.TryCreate(origin, UriKind.Absolute, out var originUri))
        {
            return false;
        }

        var isSameHost = string.Equals(originUri.Authority, request.Host.Value, StringComparison.OrdinalIgnoreCase);
        return isSameHost || frontendOptions.Value.AllowedCorsOrigins.Contains(origin, StringComparer.OrdinalIgnoreCase);
    }
}
