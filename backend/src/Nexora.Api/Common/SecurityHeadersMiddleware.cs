namespace Nexora.Api.Common;

/// <summary>
/// Defensive headers for every API response. The API only serves JSON, so its Content-Security-Policy
/// allows nothing at all: if a response were ever rendered as a page (e.g. a JSON string with HTML
/// in it opened directly), no script, frame or resource could load.
/// </summary>
internal sealed class SecurityHeadersMiddleware(RequestDelegate next, IHostEnvironment environment)
{
    private const string ApiContentSecurityPolicy = "default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'";

    // Endpoints with personal or session data must never be stored by browsers or shared caches
    // (nor, later, by the PWA service worker).
    private static readonly string[] PrivatePathPrefixes =
        ["/api/v1/auth", "/api/v1/orders", "/api/v1/checkout", "/api/v1/cart", "/api/v1/admin"];

    public Task InvokeAsync(HttpContext context)
    {
        context.Response.OnStarting(() =>
        {
            var headers = context.Response.Headers;
            headers.XContentTypeOptions = "nosniff";
            headers.XFrameOptions = "DENY";
            headers["Referrer-Policy"] = "no-referrer";
            headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=(), payment=(), usb=()";
            headers["Cross-Origin-Opener-Policy"] = "same-origin";
            headers["Cross-Origin-Resource-Policy"] = "same-site";

            // The interactive API docs (Development only) need their own scripts and styles.
            if (!IsDevelopmentDocs(context.Request.Path))
            {
                headers.ContentSecurityPolicy = ApiContentSecurityPolicy;
            }

            if (PrivatePathPrefixes.Any(prefix => context.Request.Path.StartsWithSegments(prefix, StringComparison.OrdinalIgnoreCase)))
            {
                headers.CacheControl = "no-store";
            }

            return Task.CompletedTask;
        });

        return next(context);
    }

    private bool IsDevelopmentDocs(PathString path) =>
        environment.IsDevelopment()
        && (path.StartsWithSegments("/scalar", StringComparison.OrdinalIgnoreCase)
            || path.StartsWithSegments("/openapi", StringComparison.OrdinalIgnoreCase));
}
