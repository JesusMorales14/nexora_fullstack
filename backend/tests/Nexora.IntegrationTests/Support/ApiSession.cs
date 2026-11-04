using System.Net.Http.Json;
using Nexora.Api.Auth;

namespace Nexora.IntegrationTests.Support;

/// <summary>
/// Behaves like the SPA: keeps cookies, fetches an antiforgery token and sends it on unsafe requests.
/// </summary>
public sealed class ApiSession(HttpClient client) : IDisposable
{
    private string? _csrfToken;

    public HttpClient Client => client;

    private static CancellationToken CancellationToken => TestContext.Current.CancellationToken;

    /// <summary>The token is bound to the identity, so it must be refreshed after login/logout.</summary>
    public async Task RefreshCsrfTokenAsync()
    {
        var response = await client.GetFromJsonAsync<CsrfTokenResponse>(new Uri("/api/v1/auth/csrf", UriKind.Relative), CancellationToken);
        _csrfToken = response?.Token;
    }

    public Task<HttpResponseMessage> GetAsync(string path) =>
        client.GetAsync(new Uri(path, UriKind.Relative), CancellationToken);

    public async Task<HttpResponseMessage> PostAsync<T>(
        string path,
        T body,
        bool includeCsrfToken = true,
        IReadOnlyDictionary<string, string>? headers = null)
    {
        if (includeCsrfToken && _csrfToken is null)
        {
            await RefreshCsrfTokenAsync();
        }

        using var request = new HttpRequestMessage(HttpMethod.Post, new Uri(path, UriKind.Relative))
        {
            Content = JsonContent.Create(body),
        };

        if (includeCsrfToken)
        {
            request.Headers.Add(AuthSetup.CsrfHeaderName, _csrfToken);
        }

        foreach (var (name, value) in headers ?? new Dictionary<string, string>())
        {
            request.Headers.Add(name, value);
        }

        return await client.SendAsync(request, CancellationToken);
    }

    public async Task<HttpResponseMessage> RegisterAsync(string email, string password, string fullName = "Cliente de Prueba")
    {
        var response = await PostAsync("/api/v1/auth/register", new RegisterRequest { Email = email, Password = password, FullName = fullName });
        await RefreshCsrfTokenAsync();
        return response;
    }

    public async Task<HttpResponseMessage> LoginAsync(string email, string password)
    {
        var response = await PostAsync("/api/v1/auth/login", new LoginRequest { Email = email, Password = password });
        await RefreshCsrfTokenAsync();
        return response;
    }

    public void Dispose() => client.Dispose();
}
