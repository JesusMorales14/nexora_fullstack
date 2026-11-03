using Nexora.Application.Common;

namespace Nexora.Application.Catalog;

/// <summary>
/// Read side of the storefront catalog. Implemented in Infrastructure with EF Core projections
/// straight into the response DTOs, so entities never leave the persistence layer.
/// </summary>
public interface IProductCatalog
{
    Task<PagedResponse<ProductSummaryResponse>> ListProductsAsync(ProductListQuery query, CancellationToken cancellationToken);

    Task<ProductDetailsResponse?> GetProductBySlugAsync(string slug, CancellationToken cancellationToken);

    Task<IReadOnlyList<CategoryResponse>> ListCategoriesAsync(CancellationToken cancellationToken);

    Task<IReadOnlyList<BrandResponse>> ListBrandsAsync(CancellationToken cancellationToken);
}
