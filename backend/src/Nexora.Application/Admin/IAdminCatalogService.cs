using Nexora.Application.Common;

namespace Nexora.Application.Admin;

/// <summary>Catalog management for administrators. Every write is recorded in the audit log.</summary>
public interface IAdminCatalogService
{
    Task<PagedResponse<AdminProductListItem>> ListProductsAsync(AdminProductListRequest request, CancellationToken cancellationToken);

    Task<AdminProductDetails?> GetProductAsync(Guid productId, CancellationToken cancellationToken);

    Task<CommandResult<AdminProductDetails>> CreateProductAsync(CreateProductRequest request, CancellationToken cancellationToken);

    Task<CommandResult<AdminProductDetails>> UpdateProductAsync(Guid productId, UpdateProductRequest request, CancellationToken cancellationToken);

    Task<CommandResult<AdminProductDetails>> AddVariantAsync(Guid productId, ProductVariantInput request, CancellationToken cancellationToken);

    Task<CommandResult<AdminProductDetails>> UpdateVariantAsync(Guid productId, Guid variantId, UpdateVariantRequest request, CancellationToken cancellationToken);

    Task<CommandResult<AdminProductDetails>> AddImageAsync(Guid productId, ProductImageInput request, CancellationToken cancellationToken);

    Task<CommandResult<AdminProductDetails>> RemoveImageAsync(Guid productId, Guid imageId, CancellationToken cancellationToken);

    Task<IReadOnlyList<AdminCategoryResponse>> ListCategoriesAsync(CancellationToken cancellationToken);

    Task<CommandResult<AdminCategoryResponse>> CreateCategoryAsync(CategoryRequest request, CancellationToken cancellationToken);

    Task<CommandResult<AdminCategoryResponse>> UpdateCategoryAsync(Guid categoryId, CategoryRequest request, CancellationToken cancellationToken);

    Task<CommandResult<bool>> DeleteCategoryAsync(Guid categoryId, CancellationToken cancellationToken);

    Task<IReadOnlyList<AdminBrandResponse>> ListBrandsAsync(CancellationToken cancellationToken);

    Task<CommandResult<AdminBrandResponse>> CreateBrandAsync(BrandRequest request, CancellationToken cancellationToken);
}

public interface IAdminInventoryService
{
    Task<PagedResponse<InventoryItemResponse>> ListAsync(AdminInventoryListRequest request, CancellationToken cancellationToken);

    Task<CommandResult<InventoryItemResponse>> AdjustAsync(Guid variantId, InventoryAdjustmentRequest request, CancellationToken cancellationToken);

    Task<IReadOnlyList<InventoryMovementResponse>?> ListMovementsAsync(Guid variantId, CancellationToken cancellationToken);
}

public interface IAuditLogQueries
{
    Task<PagedResponse<AuditLogEntryResponse>> ListAsync(int page, int pageSize, CancellationToken cancellationToken);
}
