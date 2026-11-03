using Microsoft.AspNetCore.Mvc;
using Nexora.Application.Catalog;

namespace Nexora.Api.Catalog;

/// <summary>Small reference lists used to build the storefront filters and navigation.</summary>
[ApiController]
[Route("api/v1")]
public sealed class CatalogLookupsController(IProductCatalog catalog) : ControllerBase
{
    [HttpGet("categories")]
    [ProducesResponseType<IReadOnlyList<CategoryResponse>>(StatusCodes.Status200OK)]
    public async Task<IReadOnlyList<CategoryResponse>> ListCategoriesAsync(CancellationToken cancellationToken) =>
        await catalog.ListCategoriesAsync(cancellationToken);

    [HttpGet("brands")]
    [ProducesResponseType<IReadOnlyList<BrandResponse>>(StatusCodes.Status200OK)]
    public async Task<IReadOnlyList<BrandResponse>> ListBrandsAsync(CancellationToken cancellationToken) =>
        await catalog.ListBrandsAsync(cancellationToken);
}
