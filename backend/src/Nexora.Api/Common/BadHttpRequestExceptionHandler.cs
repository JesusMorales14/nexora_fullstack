using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Mvc;

namespace Nexora.Api.Common;

/// <summary>
/// Kestrel reports protocol-level client errors (body over MaxRequestBodySize → 413, malformed request
/// → 400) by throwing BadHttpRequestException. Without this they would surface as a generic 500.
/// </summary>
public sealed class BadHttpRequestExceptionHandler(IProblemDetailsService problemDetailsService) : IExceptionHandler
{
    public async ValueTask<bool> TryHandleAsync(HttpContext httpContext, Exception exception, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(httpContext);

        if (exception is not BadHttpRequestException badRequest)
        {
            return false;
        }

        httpContext.Response.StatusCode = badRequest.StatusCode;
        return await problemDetailsService.TryWriteAsync(new ProblemDetailsContext
        {
            HttpContext = httpContext,
            Exception = exception,
            ProblemDetails = new ProblemDetails
            {
                Status = badRequest.StatusCode,
                Title = badRequest.StatusCode == StatusCodes.Status413PayloadTooLarge ? "Request too large" : "Bad request",
            },
        });
    }
}
