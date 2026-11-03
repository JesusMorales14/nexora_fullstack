using System.Linq.Expressions;
using Microsoft.EntityFrameworkCore;
using Nexora.Application.Catalog;
using Nexora.Application.Common;
using Nexora.Domain.Catalog;
using Nexora.Infrastructure.Persistence;

namespace Nexora.Infrastructure.Catalog;

internal sealed class ProductCatalog(NexoraDbContext db) : IProductCatalog
{
    private const string LikeEscapeCharacter = "\\";

    // Translatable to SQL; InventoryItem.IsInStock is a C# property EF cannot translate.
    private static readonly Expression<Func<ProductVariant, bool>> VariantIsInStock =
        variant => variant.Inventory.OnHand - variant.Inventory.Reserved > 0;

    public async Task<PagedResponse<ProductSummaryResponse>> ListProductsAsync(
        ProductListQuery query,
        CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(query);

        var products = db.Products.AsNoTracking().Where(product => product.IsPublished);
        string? searchPattern = null;

        if (query.Search is { } search)
        {
            searchPattern = $"%{EscapeLikePattern(search)}%";
            products = products.Where(product =>
                EF.Functions.ILike(product.Name, searchPattern, LikeEscapeCharacter)
                || EF.Functions.ILike(product.Description, searchPattern, LikeEscapeCharacter));
        }

        if (query.CategorySlug is { } categorySlug)
        {
            // Includes products of direct subcategories, so /categories/perifericos lists keyboards too.
            products = products.Where(product =>
                product.Category.Slug == categorySlug
                || (product.Category.Parent != null && product.Category.Parent.Slug == categorySlug));
        }

        if (query.BrandSlug is { } brandSlug)
        {
            products = products.Where(product => product.Brand.Slug == brandSlug);
        }

        if (query.MinPrice is { } minPrice)
        {
            products = products.Where(product => product.Variants.Any(variant => variant.Price >= minPrice));
        }

        if (query.MaxPrice is { } maxPrice)
        {
            products = products.Where(product => product.Variants.Any(variant => variant.Price <= maxPrice));
        }

        if (query.InStockOnly)
        {
            products = products.Where(product => product.Variants.AsQueryable().Any(VariantIsInStock));
        }

        var totalCount = await products.CountAsync(cancellationToken);

        var items = await ApplySort(products, query.Sort, searchPattern)
            .Skip((query.Page - 1) * query.PageSize)
            .Take(query.PageSize)
            .Select(product => new ProductSummaryResponse(
                product.Id,
                product.Slug,
                product.Name,
                product.Brand.Name,
                product.Category.Slug,
                product.Images
                    .OrderBy(image => image.SortOrder)
                    .Select(image => new ProductImageResponse(image.Url, image.AltText, image.Width, image.Height))
                    .FirstOrDefault(),
                product.Variants.Min(variant => variant.Price),
                product.Variants
                    .OrderBy(variant => variant.Price)
                    .Select(variant => variant.CompareAtPrice)
                    .FirstOrDefault(),
                StoreCurrency.Code,
                product.Variants.AsQueryable().Any(VariantIsInStock)))
            .ToListAsync(cancellationToken);

        return new PagedResponse<ProductSummaryResponse>(items, query.Page, query.PageSize, totalCount);
    }

    public Task<ProductDetailsResponse?> GetProductBySlugAsync(string slug, CancellationToken cancellationToken) =>
        db.Products
            .AsNoTracking()
            .Where(product => product.IsPublished && product.Slug == slug)
            .Select(product => new ProductDetailsResponse(
                product.Id,
                product.Slug,
                product.Name,
                product.Description,
                product.Brand.Name,
                product.Brand.Slug,
                product.Category.Name,
                product.Category.Slug,
                StoreCurrency.Code,
                product.Images
                    .OrderBy(image => image.SortOrder)
                    .Select(image => new ProductImageResponse(image.Url, image.AltText, image.Width, image.Height))
                    .ToList(),
                product.Variants
                    .OrderBy(variant => variant.Price)
                    .Select(variant => new ProductVariantResponse(
                        variant.Id,
                        variant.Sku,
                        variant.Name,
                        variant.Price,
                        variant.CompareAtPrice,
                        variant.Inventory.OnHand - variant.Inventory.Reserved > 0,
                        variant.Inventory.OnHand - variant.Inventory.Reserved <= variant.Inventory.LowStockThreshold))
                    .ToList()))
            .AsSplitQuery()
            .FirstOrDefaultAsync(cancellationToken);

    public async Task<IReadOnlyList<CategoryResponse>> ListCategoriesAsync(CancellationToken cancellationToken) =>
        await db.Categories
            .AsNoTracking()
            .OrderBy(category => category.Name)
            .Select(category => new CategoryResponse(
                category.Id,
                category.Name,
                category.Slug,
                category.Parent == null ? null : category.Parent.Slug))
            .ToListAsync(cancellationToken);

    public async Task<IReadOnlyList<BrandResponse>> ListBrandsAsync(CancellationToken cancellationToken) =>
        await db.Brands
            .AsNoTracking()
            .OrderBy(brand => brand.Name)
            .Select(brand => new BrandResponse(brand.Id, brand.Name, brand.Slug))
            .ToListAsync(cancellationToken);

    /// <summary>Every ordering ends with Id so pagination is deterministic.</summary>
    private static IQueryable<Product> ApplySort(IQueryable<Product> products, ProductSort sort, string? searchPattern) =>
        sort switch
        {
            ProductSort.PriceAsc => products
                .OrderBy(product => product.Variants.Min(variant => variant.Price))
                .ThenBy(product => product.Id),
            ProductSort.PriceDesc => products
                .OrderByDescending(product => product.Variants.Min(variant => variant.Price))
                .ThenBy(product => product.Id),
            ProductSort.NameAsc => products
                .OrderBy(product => product.Name)
                .ThenBy(product => product.Id),
            ProductSort.Relevance when searchPattern is not null => products
                .OrderByDescending(product => EF.Functions.ILike(product.Name, searchPattern, LikeEscapeCharacter))
                .ThenByDescending(product => product.IsFeatured)
                .ThenBy(product => product.Name)
                .ThenBy(product => product.Id),
            ProductSort.Relevance => products
                .OrderByDescending(product => product.IsFeatured)
                .ThenByDescending(product => product.CreatedAt)
                .ThenBy(product => product.Id),
            _ => throw new ArgumentOutOfRangeException(nameof(sort), sort, "Unsupported sort."),
        };

    /// <summary>User input must not be able to inject LIKE wildcards (% and _).</summary>
    private static string EscapeLikePattern(string value) =>
        value
            .Replace(LikeEscapeCharacter, LikeEscapeCharacter + LikeEscapeCharacter, StringComparison.Ordinal)
            .Replace("%", LikeEscapeCharacter + "%", StringComparison.Ordinal)
            .Replace("_", LikeEscapeCharacter + "_", StringComparison.Ordinal);
}
