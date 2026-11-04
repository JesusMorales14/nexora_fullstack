using System.Globalization;
using System.Text;
using System.Xml;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;
using Nexora.Api.Configuration;
using Nexora.Application.Catalog;

namespace Nexora.Api.Seo;

/// <summary>Crawler-facing endpoints. Only public catalog data, never anything private.</summary>
[ApiController]
public sealed class SeoController(
    IProductCatalog catalog,
    ISitemapSource sitemapSource,
    IIndexHtmlTemplate indexHtml,
    IOptions<FrontendOptions> frontendOptions) : ControllerBase
{
    private const string PublicCacheControl = "public, max-age=3600";

    private string SiteUrl => frontendOptions.Value.BaseUrl.TrimEnd('/');

    /// <summary>Home, catalog, category and published product URLs (drafts are never listed).</summary>
    [HttpGet("/sitemap.xml")]
    [Produces("application/xml")]
    public async Task<IActionResult> SitemapAsync(CancellationToken cancellationToken)
    {
        var products = await sitemapSource.ListPublishedProductsAsync(cancellationToken);
        var categories = await catalog.ListCategoriesAsync(cancellationToken);

        var builder = new StringBuilder();
        var settings = new XmlWriterSettings { Async = true, Encoding = new UTF8Encoding(false), Indent = true };
        await using (var writer = XmlWriter.Create(builder, settings))
        {
            await writer.WriteStartDocumentAsync();
            writer.WriteStartElement("urlset", "http://www.sitemaps.org/schemas/sitemap/0.9");

            WriteUrl(writer, $"{SiteUrl}/", lastModified: null);
            WriteUrl(writer, $"{SiteUrl}/products", lastModified: null);
            foreach (var category in categories)
            {
                WriteUrl(writer, $"{SiteUrl}/products?category={Uri.EscapeDataString(category.Slug)}", lastModified: null);
            }

            foreach (var product in products)
            {
                WriteUrl(writer, $"{SiteUrl}/products/{Uri.EscapeDataString(product.Slug)}", product.UpdatedAt);
            }

            await writer.WriteEndElementAsync();
            await writer.WriteEndDocumentAsync();
        }

        Response.Headers.CacheControl = PublicCacheControl;
        // XmlWriter over a StringBuilder declares UTF-16; the response itself is UTF-8.
        var xml = builder.ToString().Replace("encoding=\"utf-16\"", "encoding=\"utf-8\"", StringComparison.Ordinal);
        return Content(xml, "application/xml; charset=utf-8");
    }

    /// <summary>
    /// The storefront host routes HTML requests for /products/{slug} here (see ADR-0001): the SPA shell
    /// with real metadata. Browsers then run the SPA as usual.
    /// </summary>
    [HttpGet("/seo/products/{slug}")]
    [Produces("text/html")]
    public async Task<IActionResult> ProductPageAsync(string slug, CancellationToken cancellationToken)
    {
        var template = await indexHtml.GetAsync(cancellationToken);
        var product = await catalog.GetProductBySlugAsync(slug, cancellationToken);

        if (product is null)
        {
            return new ContentResult
            {
                StatusCode = StatusCodes.Status404NotFound,
                Content = ProductPageRenderer.RenderNotFound(template),
                ContentType = "text/html; charset=utf-8",
            };
        }

        Response.Headers.CacheControl = "public, max-age=300";
        return Content(ProductPageRenderer.RenderProduct(template, product, SiteUrl), "text/html; charset=utf-8");
    }

    private static void WriteUrl(XmlWriter writer, string location, DateTimeOffset? lastModified)
    {
        writer.WriteStartElement("url");
        writer.WriteElementString("loc", location);
        if (lastModified is { } date)
        {
            writer.WriteElementString("lastmod", date.UtcDateTime.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture));
        }

        writer.WriteEndElement();
    }
}
