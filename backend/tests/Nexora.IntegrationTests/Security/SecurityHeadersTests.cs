namespace Nexora.IntegrationTests.Security;

public sealed class SecurityHeadersTests(NexoraApiFactory factory)
{
    [Fact]
    public async Task ResponsesCarryDefensiveHeaders()
    {
        using var session = factory.CreateSession();

        var response = await session.GetAsync("/api/v1/brands");

        Assert.Equal("nosniff", response.Headers.GetValues("X-Content-Type-Options").Single());
        Assert.Equal("DENY", response.Headers.GetValues("X-Frame-Options").Single());
        Assert.Equal("no-referrer", response.Headers.GetValues("Referrer-Policy").Single());
        Assert.StartsWith("default-src 'none'", response.Headers.GetValues("Content-Security-Policy").Single(), StringComparison.Ordinal);
        Assert.False(response.Headers.Contains("Server"));
        // Public catalog data may be cached; it is not marked no-store.
        Assert.Null(response.Headers.CacheControl);
    }

    [Theory]
    [InlineData("/api/v1/auth/me")]
    [InlineData("/api/v1/auth/csrf")]
    [InlineData("/api/v1/orders")]
    [InlineData("/api/v1/admin/summary")]
    public async Task PrivateEndpointsAreNeverCached(string path)
    {
        using var session = factory.CreateSession();

        var response = await session.GetAsync(path);

        Assert.True(response.Headers.CacheControl?.NoStore, $"{path} should be no-store (status {(int)response.StatusCode}).");
    }
}
