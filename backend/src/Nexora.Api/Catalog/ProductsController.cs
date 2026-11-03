using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.ModelBinding;
using Nexora.Application.Catalog;
using Nexora.Application.Common;

namespace Nexora.Api.Catalog;

[ApiController]
[Route("api/v1/products")]
public sealed class ProductsController(IProductCatalog catalog) : ControllerBase
{
    /// <summary>Paginated, filterable list of published products.</summary>
    [HttpGet]
    [ProducesResponseType<PagedResponse<ProductSummaryResponse>>(StatusCodes.Status200OK, "application/json")]
    [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest, "application/problem+json")]
    public async Task<IActionResult> ListAsync([FromQuery] ProductListRequest request, CancellationToken cancellationToken)
    {
        var (query, errors) = ProductListQuery.Create(request);

        if (query is null)
        {
            // A fresh dictionary keeps our camelCase keys: the bound ModelState is case-insensitive
            // and would file them under the C# property names (PageSize, Sort...).
            var validationErrors = new ModelStateDictionary();
            foreach (var (field, messages) in errors)
            {
                foreach (var message in messages)
                {
                    validationErrors.AddModelError(field, message);
                }
            }

            // This overload goes through ProblemDetailsFactory, which adds type and traceId.
            return ValidationProblem(validationErrors);
        }

        return Ok(await catalog.ListProductsAsync(query, cancellationToken));
    }

    /// <summary>Full product details by its public slug.</summary>
    [HttpGet("{slug}")]
    [ProducesResponseType<ProductDetailsResponse>(StatusCodes.Status200OK, "application/json")]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound, "application/problem+json")]
    public async Task<IActionResult> GetBySlugAsync(string slug, CancellationToken cancellationToken)
    {
        var product = await catalog.GetProductBySlugAsync(slug, cancellationToken);

        return product is null
            ? Problem(statusCode: StatusCodes.Status404NotFound, title: "Product not found", detail: $"No published product has the slug '{slug}'.")
            : Ok(product);
    }
}
