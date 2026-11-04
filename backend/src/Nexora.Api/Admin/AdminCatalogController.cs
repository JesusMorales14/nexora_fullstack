using FluentValidation;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Nexora.Api.Auth;
using Nexora.Api.Common;
using Nexora.Application.Admin;
using Nexora.Application.Common;

namespace Nexora.Api.Admin;

[ApiController]
[Route("api/v1/admin")]
[Authorize(Policy = AuthSetup.AdminPolicy)]
public sealed class AdminCatalogController(IAdminCatalogService catalog, IServiceProvider services) : ControllerBase
{
    // ---------- Products ----------

    [HttpGet("products")]
    [ProducesResponseType<PagedResponse<AdminProductListItem>>(StatusCodes.Status200OK, "application/json")]
    public async Task<PagedResponse<AdminProductListItem>> ListProductsAsync([FromQuery] AdminProductListRequest request, CancellationToken cancellationToken) =>
        await catalog.ListProductsAsync(request, cancellationToken);

    [HttpGet("products/{productId:guid}")]
    [ProducesResponseType<AdminProductDetails>(StatusCodes.Status200OK, "application/json")]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound, "application/problem+json")]
    public async Task<IActionResult> GetProductAsync(Guid productId, CancellationToken cancellationToken) =>
        await catalog.GetProductAsync(productId, cancellationToken) is { } product
            ? Ok(product)
            : Problem(statusCode: StatusCodes.Status404NotFound, title: "Not found", detail: "El producto no existe.");

    [HttpPost("products")]
    [ProducesResponseType<AdminProductDetails>(StatusCodes.Status201Created, "application/json")]
    [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest, "application/problem+json")]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status409Conflict, "application/problem+json")]
    public Task<IActionResult> CreateProductAsync(CreateProductRequest request, CancellationToken cancellationToken) =>
        ValidateThenAsync(request, async () => this.ToActionResult(
            await catalog.CreateProductAsync(request, cancellationToken),
            product => Created($"/api/v1/admin/products/{product.Id}", product)));

    [HttpPut("products/{productId:guid}")]
    [ProducesResponseType<AdminProductDetails>(StatusCodes.Status200OK, "application/json")]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status409Conflict, "application/problem+json")]
    public Task<IActionResult> UpdateProductAsync(Guid productId, UpdateProductRequest request, CancellationToken cancellationToken) =>
        ValidateThenAsync(request, async () => this.ToActionResult(
            await catalog.UpdateProductAsync(productId, request, cancellationToken), Ok));

    [HttpPost("products/{productId:guid}/variants")]
    [ProducesResponseType<AdminProductDetails>(StatusCodes.Status200OK, "application/json")]
    public Task<IActionResult> AddVariantAsync(Guid productId, ProductVariantInput request, CancellationToken cancellationToken) =>
        ValidateThenAsync(request, async () => this.ToActionResult(
            await catalog.AddVariantAsync(productId, request, cancellationToken), Ok));

    [HttpPut("products/{productId:guid}/variants/{variantId:guid}")]
    [ProducesResponseType<AdminProductDetails>(StatusCodes.Status200OK, "application/json")]
    public Task<IActionResult> UpdateVariantAsync(Guid productId, Guid variantId, UpdateVariantRequest request, CancellationToken cancellationToken) =>
        ValidateThenAsync(request, async () => this.ToActionResult(
            await catalog.UpdateVariantAsync(productId, variantId, request, cancellationToken), Ok));

    [HttpPost("products/{productId:guid}/images")]
    [ProducesResponseType<AdminProductDetails>(StatusCodes.Status200OK, "application/json")]
    public Task<IActionResult> AddImageAsync(Guid productId, ProductImageInput request, CancellationToken cancellationToken) =>
        ValidateThenAsync(request, async () => this.ToActionResult(
            await catalog.AddImageAsync(productId, request, cancellationToken), Ok));

    [HttpDelete("products/{productId:guid}/images/{imageId:guid}")]
    [ProducesResponseType<AdminProductDetails>(StatusCodes.Status200OK, "application/json")]
    public async Task<IActionResult> RemoveImageAsync(Guid productId, Guid imageId, CancellationToken cancellationToken) =>
        this.ToActionResult(await catalog.RemoveImageAsync(productId, imageId, cancellationToken), Ok);

    // ---------- Categories and brands ----------

    [HttpGet("categories")]
    [ProducesResponseType<IReadOnlyList<AdminCategoryResponse>>(StatusCodes.Status200OK, "application/json")]
    public async Task<IReadOnlyList<AdminCategoryResponse>> ListCategoriesAsync(CancellationToken cancellationToken) =>
        await catalog.ListCategoriesAsync(cancellationToken);

    [HttpPost("categories")]
    [ProducesResponseType<AdminCategoryResponse>(StatusCodes.Status201Created, "application/json")]
    public Task<IActionResult> CreateCategoryAsync(CategoryRequest request, CancellationToken cancellationToken) =>
        ValidateThenAsync(request, async () => this.ToActionResult(
            await catalog.CreateCategoryAsync(request, cancellationToken),
            category => Created($"/api/v1/admin/categories/{category.Id}", category)));

    [HttpPut("categories/{categoryId:guid}")]
    [ProducesResponseType<AdminCategoryResponse>(StatusCodes.Status200OK, "application/json")]
    public Task<IActionResult> UpdateCategoryAsync(Guid categoryId, CategoryRequest request, CancellationToken cancellationToken) =>
        ValidateThenAsync(request, async () => this.ToActionResult(
            await catalog.UpdateCategoryAsync(categoryId, request, cancellationToken), Ok));

    [HttpDelete("categories/{categoryId:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status409Conflict, "application/problem+json")]
    public async Task<IActionResult> DeleteCategoryAsync(Guid categoryId, CancellationToken cancellationToken) =>
        this.ToActionResult(await catalog.DeleteCategoryAsync(categoryId, cancellationToken), _ => NoContent());

    [HttpGet("brands")]
    [ProducesResponseType<IReadOnlyList<AdminBrandResponse>>(StatusCodes.Status200OK, "application/json")]
    public async Task<IReadOnlyList<AdminBrandResponse>> ListBrandsAsync(CancellationToken cancellationToken) =>
        await catalog.ListBrandsAsync(cancellationToken);

    [HttpPost("brands")]
    [ProducesResponseType<AdminBrandResponse>(StatusCodes.Status201Created, "application/json")]
    public Task<IActionResult> CreateBrandAsync(BrandRequest request, CancellationToken cancellationToken) =>
        ValidateThenAsync(request, async () => this.ToActionResult(
            await catalog.CreateBrandAsync(request, cancellationToken),
            brand => Created($"/api/v1/admin/brands/{brand.Id}", brand)));

    private async Task<IActionResult> ValidateThenAsync<TRequest>(TRequest request, Func<Task<IActionResult>> action)
    {
        var validation = await services.GetRequiredService<IValidator<TRequest>>().ValidateAsync(request, HttpContext.RequestAborted);
        return validation.IsValid ? await action() : this.ToValidationProblem(validation);
    }
}
