using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Routing;
using Microsoft.Extensions.DependencyInjection;
using Nexora.Api.Auth;

namespace Nexora.IntegrationTests.Security;

/// <summary>
/// Permission review as a test: enumerates every endpoint the API exposes, so a new endpoint that
/// forgets [Authorize] (or the admin policy) fails the build instead of shipping publicly.
/// </summary>
public sealed class EndpointAuthorizationTests(NexoraApiFactory factory)
{
    /// <summary>The only endpoints reachable without a session. Adding one here is a deliberate decision.</summary>
    private static readonly HashSet<string> AnonymousEndpoints = new(StringComparer.Ordinal)
    {
        // Health checks are mapped for any method; they expose only "Healthy"/"Unhealthy".
        "ANY health",
        "GET api/v1/products",
        "GET api/v1/products/{slug}",
        "GET api/v1/categories",
        "GET api/v1/brands",
        "POST api/v1/cart/quote",
        "GET api/v1/auth/csrf",
        "POST api/v1/auth/register",
        "POST api/v1/auth/login",
        "POST api/v1/auth/logout",
        "POST api/v1/auth/forgot-password",
        "POST api/v1/auth/reset-password",
    };

    private IReadOnlyList<(string Key, IReadOnlyList<IAuthorizeData> Authorization, bool AllowsAnonymous)> Endpoints()
    {
        var dataSource = factory.Services.GetRequiredService<EndpointDataSource>();

        return [.. dataSource.Endpoints
            .OfType<RouteEndpoint>()
            // OpenAPI/Scalar only exist in Development; the test host runs as "Testing".
            .Where(endpoint => endpoint.RoutePattern.RawText is not null)
            .SelectMany(endpoint =>
            {
                var methods = endpoint.Metadata.GetMetadata<HttpMethodMetadata>()?.HttpMethods ?? ["ANY"];
                var route = endpoint.RoutePattern.RawText!.TrimStart('/');
                var authorization = endpoint.Metadata.GetOrderedMetadata<IAuthorizeData>();
                var allowsAnonymous = endpoint.Metadata.GetMetadata<IAllowAnonymous>() is not null;
                return methods.Select(method => ($"{method} {route}", authorization, allowsAnonymous));
            })];
    }

    [Fact]
    public void EveryAdminEndpointRequiresTheAdminPolicy()
    {
        var adminEndpoints = Endpoints().Where(endpoint => endpoint.Key.Contains(" api/v1/admin", StringComparison.Ordinal)).ToList();

        Assert.NotEmpty(adminEndpoints);
        Assert.All(adminEndpoints, endpoint =>
        {
            Assert.False(endpoint.AllowsAnonymous, $"{endpoint.Key} allows anonymous access.");
            Assert.Contains(endpoint.Authorization, data => data.Policy == AuthSetup.AdminPolicy);
        });
    }

    [Fact]
    public void OnlyAllowlistedEndpointsArePublic()
    {
        var publicEndpoints = Endpoints()
            .Where(endpoint => endpoint.Authorization.Count == 0 || endpoint.AllowsAnonymous)
            .Select(endpoint => endpoint.Key)
            .ToHashSet(StringComparer.Ordinal);

        Assert.Empty(publicEndpoints.Except(AnonymousEndpoints));
    }
}
