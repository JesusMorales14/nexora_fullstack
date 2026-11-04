namespace Nexora.Application.Catalog;

public sealed record SitemapProduct(string Slug, DateTimeOffset UpdatedAt);

/// <summary>Published product URLs for the sitemap (bounded by the sitemap protocol's 50,000 URLs).</summary>
public interface ISitemapSource
{
    Task<IReadOnlyList<SitemapProduct>> ListPublishedProductsAsync(CancellationToken cancellationToken);
}
