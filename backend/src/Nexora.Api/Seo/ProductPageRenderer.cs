using System.Globalization;
using System.Net;
using System.Text;
using System.Text.Encodings.Web;
using System.Text.Json;
using System.Text.RegularExpressions;
using Nexora.Application.Catalog;

namespace Nexora.Api.Seo;

/// <summary>
/// Fills the SPA shell with the product's title, description, canonical URL, Open Graph tags and
/// schema.org JSON-LD, so crawlers that do not run JavaScript (social previews) see real content.
/// Every value comes from the database and is HTML-encoded or JSON-escaped before insertion.
/// </summary>
public static partial class ProductPageRenderer
{
    public const string ServerSeoAttribute = "data-server-seo";
    private const int DescriptionMaxLength = 160;

    // Escapes <, >, & and quotes as \uXXXX: the JSON can never close its <script> element.
    private static readonly JsonSerializerOptions JsonLdOptions = new()
    {
        Encoder = JavaScriptEncoder.Default,
        WriteIndented = false,
    };

    public static string RenderProduct(string template, ProductDetailsResponse product, string siteUrl)
    {
        ArgumentNullException.ThrowIfNull(template);
        ArgumentNullException.ThrowIfNull(product);

        var productUrl = $"{siteUrl.TrimEnd('/')}/products/{Uri.EscapeDataString(product.Slug)}";
        var title = $"{product.Name} | Nexora";
        var description = Truncate(product.Description, DescriptionMaxLength);
        var imageUrl = product.Images.Count > 0 ? ToAbsolute(product.Images[0].Url, siteUrl) : null;
        var lowestPrice = product.Variants.Count > 0 ? product.Variants.Min(variant => variant.Price) : 0m;
        var isInStock = product.Variants.Any(variant => variant.IsInStock);

        var head = new StringBuilder()
            .Append(Meta("property", "og:type", "product"))
            .Append(Meta("property", "og:site_name", "Nexora"))
            .Append(Meta("property", "og:locale", "es_PE"))
            .Append(Meta("property", "og:title", title))
            .Append(Meta("property", "og:description", description))
            .Append(Meta("property", "og:url", productUrl))
            .Append(Meta("property", "product:price:amount", lowestPrice.ToString("0.00", CultureInfo.InvariantCulture)))
            .Append(Meta("property", "product:price:currency", product.Currency))
            .Append(Meta("name", "twitter:card", imageUrl is null ? "summary" : "summary_large_image"))
            .Append(CultureInfo.InvariantCulture, $"<link rel=\"canonical\" href=\"{Encode(productUrl)}\" {ServerSeoAttribute}>");

        if (imageUrl is not null)
        {
            head.Append(Meta("property", "og:image", imageUrl));
        }

        head.Append(CultureInfo.InvariantCulture, $"<script type=\"application/ld+json\" {ServerSeoAttribute}>{BuildJsonLd(product, productUrl, siteUrl, isInStock)}</script>");

        return Inject(template, title, description, head.ToString(), robots: null);
    }

    /// <summary>Shell for a product that does not exist (served with HTTP 404): never indexed.</summary>
    public static string RenderNotFound(string template) =>
        Inject(template, "Producto no encontrado | Nexora", "El producto no existe o ya no está disponible.", extraHead: string.Empty, robots: "noindex");

    private static string BuildJsonLd(ProductDetailsResponse product, string productUrl, string siteUrl, bool isInStock)
    {
        var prices = product.Variants.Select(variant => variant.Price).DefaultIfEmpty(0m).ToList();
        var jsonLd = new Dictionary<string, object?>
        {
            ["@context"] = "https://schema.org",
            ["@type"] = "Product",
            ["name"] = product.Name,
            ["description"] = product.Description,
            ["sku"] = product.Variants.Count > 0 ? product.Variants[0].Sku : null,
            ["url"] = productUrl,
            ["image"] = product.Images.Select(image => ToAbsolute(image.Url, siteUrl)).ToList(),
            ["brand"] = new Dictionary<string, object?> { ["@type"] = "Brand", ["name"] = product.BrandName },
            ["offers"] = new Dictionary<string, object?>
            {
                ["@type"] = "AggregateOffer",
                ["priceCurrency"] = product.Currency,
                ["lowPrice"] = prices.Min().ToString("0.00", CultureInfo.InvariantCulture),
                ["highPrice"] = prices.Max().ToString("0.00", CultureInfo.InvariantCulture),
                ["offerCount"] = product.Variants.Count,
                ["availability"] = isInStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
            },
        };

        return JsonSerializer.Serialize(jsonLd, JsonLdOptions);
    }

    private static string Inject(string template, string title, string description, string extraHead, string? robots)
    {
        var html = TitlePattern().Replace(template, $"<title {ServerSeoAttribute}>{Encode(title)}</title>", 1);
        html = DescriptionPattern().Replace(html, Meta("name", "description", description), 1);

        if (robots is not null)
        {
            extraHead += Meta("name", "robots", robots);
        }

        var headEnd = html.IndexOf("</head>", StringComparison.OrdinalIgnoreCase);
        return headEnd < 0 ? html : html.Insert(headEnd, extraHead);
    }

    private static string Meta(string keyAttribute, string key, string content) =>
        $"<meta {keyAttribute}=\"{Encode(key)}\" content=\"{Encode(content)}\" {ServerSeoAttribute}>";

    private static string Encode(string value) => WebUtility.HtmlEncode(value);

    private static string ToAbsolute(string url, string siteUrl) =>
        url.StartsWith("https://", StringComparison.OrdinalIgnoreCase) ? url : $"{siteUrl.TrimEnd('/')}{url}";

    private static string Truncate(string value, int maxLength) =>
        value.Length <= maxLength ? value : string.Concat(value.AsSpan(0, maxLength - 1), "…");

    [GeneratedRegex("<title>.*?</title>", RegexOptions.IgnoreCase | RegexOptions.Singleline, matchTimeoutMilliseconds: 1000)]
    private static partial Regex TitlePattern();

    [GeneratedRegex("<meta\\s+name=\"description\"[^>]*>", RegexOptions.IgnoreCase | RegexOptions.Singleline, matchTimeoutMilliseconds: 1000)]
    private static partial Regex DescriptionPattern();
}
