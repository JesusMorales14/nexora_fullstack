using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Options;
using Nexora.Api.Configuration;

namespace Nexora.Api.Seo;

/// <summary>The storefront's built index.html, used as the shell for server-rendered metadata.</summary>
public interface IIndexHtmlTemplate
{
    Task<string> GetAsync(CancellationToken cancellationToken);
}

/// <summary>
/// Downloads index.html from the storefront host (configuration only, never from user input, so it
/// cannot be abused for SSRF) and caches it briefly so a deploy of the frontend is picked up quickly.
/// </summary>
internal sealed class HttpIndexHtmlTemplate(
    HttpClient httpClient,
    IMemoryCache cache,
    IOptions<FrontendOptions> frontendOptions) : IIndexHtmlTemplate
{
    private const string CacheKey = "seo:index-html";
    private static readonly TimeSpan CacheDuration = TimeSpan.FromMinutes(5);

    public async Task<string> GetAsync(CancellationToken cancellationToken)
    {
        if (cache.TryGetValue(CacheKey, out string? cached) && cached is not null)
        {
            return cached;
        }

        var options = frontendOptions.Value;
        var templateUrl = options.IndexHtmlUrl ?? $"{options.BaseUrl.TrimEnd('/')}/index.html";
        var html = await httpClient.GetStringAsync(new Uri(templateUrl), cancellationToken);
        cache.Set(CacheKey, html, CacheDuration);
        return html;
    }
}
