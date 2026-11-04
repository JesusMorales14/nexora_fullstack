using Microsoft.EntityFrameworkCore;
using Nexora.Application.Catalog;
using Nexora.Infrastructure.Persistence;

namespace Nexora.Infrastructure.Catalog;

internal sealed class SitemapSource(NexoraDbContext db) : ISitemapSource
{
    // Sitemap protocol limit per file; a sitemap index would be needed beyond it.
    private const int MaxUrls = 49_000;

    public async Task<IReadOnlyList<SitemapProduct>> ListPublishedProductsAsync(CancellationToken cancellationToken) =>
        await db.Products
            .AsNoTracking()
            .Where(product => product.IsPublished)
            .OrderByDescending(product => product.UpdatedAt)
            .Take(MaxUrls)
            .Select(product => new SitemapProduct(product.Slug, product.UpdatedAt))
            .ToListAsync(cancellationToken);
}
