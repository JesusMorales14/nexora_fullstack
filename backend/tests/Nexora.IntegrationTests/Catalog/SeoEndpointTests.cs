using System.Net;
using System.Text.Json;
using System.Text.RegularExpressions;
using System.Xml.Linq;
using Microsoft.Extensions.DependencyInjection;
using Nexora.Domain.Catalog;
using Nexora.Infrastructure.Persistence;

namespace Nexora.IntegrationTests.Catalog;

public sealed partial class SeoEndpointTests(NexoraApiFactory factory)
{
    private const string SiteUrl = "https://nexora.test";
    private const string DraftSlug = "lenovo-legion-pro-7";
    // The seeded name contains a double quote (15"): it must be HTML-encoded inside attributes.
    private const string QuotedNameSlug = "lenovo-ideapad-slim-3-15";
    private static readonly XNamespace SitemapNs = "http://www.sitemaps.org/schemas/sitemap/0.9";

    private readonly HttpClient _client = factory.CreateClient();

    private static CancellationToken CancellationToken => TestContext.Current.CancellationToken;

    [Fact]
    public async Task SitemapListsPublishedProductsAndCategoriesWithAbsoluteUrls()
    {
        using var response = await _client.GetAsync(new Uri("/sitemap.xml", UriKind.Relative), CancellationToken);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal("application/xml", response.Content.Headers.ContentType?.MediaType);
        var document = XDocument.Parse(await response.Content.ReadAsStringAsync(CancellationToken));
        var locations = document.Descendants(SitemapNs + "loc").Select(element => element.Value).ToList();

        Assert.Contains($"{SiteUrl}/", locations);
        Assert.Contains($"{SiteUrl}/products/{QuotedNameSlug}", locations);
        Assert.Contains($"{SiteUrl}/products?category=computadoras", locations);
        Assert.DoesNotContain(locations, location => location.EndsWith(DraftSlug, StringComparison.Ordinal));
        Assert.All(locations, location => Assert.StartsWith(SiteUrl, location, StringComparison.Ordinal));
    }

    [Fact]
    public async Task ProductPageInjectsEncodedMetadataAndJsonLd()
    {
        using var response = await _client.GetAsync(new Uri($"/seo/products/{QuotedNameSlug}", UriKind.Relative), CancellationToken);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal("text/html", response.Content.Headers.ContentType?.MediaType);
        // The page must be able to run the SPA (the API's "default-src 'none'" would block it).
        var csp = Assert.Single(response.Headers.GetValues("Content-Security-Policy"));
        Assert.Contains("frame-ancestors 'none'", csp, StringComparison.Ordinal);
        Assert.DoesNotContain("default-src", csp, StringComparison.Ordinal);
        var html = await response.Content.ReadAsStringAsync(CancellationToken);

        Assert.Contains("<title data-server-seo>Lenovo IdeaPad Slim 3 15&quot; | Nexora</title>", html, StringComparison.Ordinal);
        Assert.Contains($"<link rel=\"canonical\" href=\"{SiteUrl}/products/{QuotedNameSlug}\"", html, StringComparison.Ordinal);
        Assert.Contains("property=\"og:title\"", html, StringComparison.Ordinal);
        Assert.Contains("property=\"product:price:currency\" content=\"PEN\"", html, StringComparison.Ordinal);
        // The template's own title and description were replaced, not duplicated.
        Assert.DoesNotContain("<title>Nexora</title>", html, StringComparison.Ordinal);
        Assert.Single(DescriptionTags().Matches(html));

        using var jsonLd = JsonDocument.Parse(ExtractJsonLd(html));
        Assert.Equal("Product", jsonLd.RootElement.GetProperty("@type").GetString());
        Assert.Equal("Lenovo IdeaPad Slim 3 15\"", jsonLd.RootElement.GetProperty("name").GetString());
        var offers = jsonLd.RootElement.GetProperty("offers");
        Assert.Equal("PEN", offers.GetProperty("priceCurrency").GetString());
        Assert.Equal("https://schema.org/InStock", offers.GetProperty("availability").GetString());
    }

    [Fact]
    public async Task ProductPageCannotBreakOutOfAttributesOrScript()
    {
        var slug = await CreateHostileProductAsync();

        using var response = await _client.GetAsync(new Uri($"/seo/products/{slug}", UriKind.Relative), CancellationToken);
        var html = await response.Content.ReadAsStringAsync(CancellationToken);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.DoesNotContain("<script>alert", html, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("<img", html, StringComparison.OrdinalIgnoreCase);
        // Exactly the one JSON-LD script element: the payload never closed it early.
        Assert.Single(ScriptCloseTags().Matches(html));
        using var jsonLd = JsonDocument.Parse(ExtractJsonLd(html));
        Assert.StartsWith("</script>", jsonLd.RootElement.GetProperty("name").GetString(), StringComparison.Ordinal);
    }

    [Theory]
    [InlineData(DraftSlug)]
    [InlineData("no-existe")]
    public async Task UnknownOrDraftProductIsNotFoundAndNotIndexable(string slug)
    {
        using var response = await _client.GetAsync(new Uri($"/seo/products/{slug}", UriKind.Relative), CancellationToken);
        var html = await response.Content.ReadAsStringAsync(CancellationToken);

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        Assert.Contains("name=\"robots\" content=\"noindex\"", html, StringComparison.Ordinal);
        Assert.Contains("<div id=\"root\"></div>", html, StringComparison.Ordinal);
    }

    private static string ExtractJsonLd(string html)
    {
        var match = JsonLdScript().Match(html);
        Assert.True(match.Success, "JSON-LD script not found.");
        return match.Groups["json"].Value;
    }

    private async Task<string> CreateHostileProductAsync()
    {
        var suffix = Guid.NewGuid().ToString("N")[..12];
        const string Payload = "</script><script>alert(1)</script>\"><img src=x onerror=alert(1)>";
        await using var scope = factory.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<NexoraDbContext>();
        var now = DateTimeOffset.UtcNow;

        var category = new Category($"Categoría {suffix}", $"categoria-{suffix}");
        var brand = new Brand($"Marca {suffix}", $"marca-{suffix}");
        var product = new Product(Payload, $"hostil-{suffix}", Payload, category, brand, now);
        product.AddVariant($"HOSTIL-{suffix}", "Base", 10m, initialStock: 1);
        product.Publish(now);

        db.AddRange(category, brand, product);
        await db.SaveChangesAsync(CancellationToken);
        return product.Slug;
    }

    [GeneratedRegex("<script type=\"application/ld\\+json\"[^>]*>(?<json>.*?)</script>", RegexOptions.Singleline)]
    private static partial Regex JsonLdScript();

    [GeneratedRegex("</script>", RegexOptions.IgnoreCase)]
    private static partial Regex ScriptCloseTags();

    [GeneratedRegex("<meta name=\"description\"")]
    private static partial Regex DescriptionTags();
}
