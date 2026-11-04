using Nexora.Domain.Catalog;

namespace Nexora.Application.Admin;

// ---- Requests: explicit DTOs per operation (no entity binding, no mass assignment). ----

public sealed class ProductVariantInput
{
    public string Sku { get; init; } = string.Empty;

    public string Name { get; init; } = string.Empty;

    public decimal Price { get; init; }

    public decimal? CompareAtPrice { get; init; }

    public int InitialStock { get; init; }

    public int LowStockThreshold { get; init; } = InventoryItem.DefaultLowStockThreshold;
}

public sealed class ProductImageInput
{
    public string Url { get; init; } = string.Empty;

    public string AltText { get; init; } = string.Empty;

    public int Width { get; init; }

    public int Height { get; init; }
}

public sealed class CreateProductRequest
{
    public string Name { get; init; } = string.Empty;

    public string Slug { get; init; } = string.Empty;

    public string Description { get; init; } = string.Empty;

    public Guid CategoryId { get; init; }

    public Guid BrandId { get; init; }

    public bool IsPublished { get; init; }

    public bool IsFeatured { get; init; }

    public ProductVariantInput Variant { get; init; } = new();

    public ProductImageInput? Image { get; init; }
}

public sealed class UpdateProductRequest
{
    public string Name { get; init; } = string.Empty;

    public string Slug { get; init; } = string.Empty;

    public string Description { get; init; } = string.Empty;

    public Guid CategoryId { get; init; }

    public Guid BrandId { get; init; }

    public bool IsPublished { get; init; }

    public bool IsFeatured { get; init; }

    /// <summary>Version read by the admin; a stale value means someone else saved first (409).</summary>
    public uint Version { get; init; }
}

public sealed class UpdateVariantRequest
{
    public string Name { get; init; } = string.Empty;

    public decimal Price { get; init; }

    public decimal? CompareAtPrice { get; init; }

    public int LowStockThreshold { get; init; }
}

public sealed class CategoryRequest
{
    public string Name { get; init; } = string.Empty;

    public string Slug { get; init; } = string.Empty;

    public Guid? ParentId { get; init; }
}

public sealed class BrandRequest
{
    public string Name { get; init; } = string.Empty;

    public string Slug { get; init; } = string.Empty;
}

public sealed class InventoryAdjustmentRequest
{
    /// <summary>Positive to add units, negative to remove them.</summary>
    public int QuantityChange { get; init; }

    public InventoryMovementReason Reason { get; init; }

    public string? Note { get; init; }
}

public sealed class AdminProductListRequest
{
    public int? Page { get; init; }

    public int? PageSize { get; init; }

    public string? Q { get; init; }

    public Guid? CategoryId { get; init; }

    /// <summary>"published" or "draft".</summary>
    public string? Status { get; init; }
}

public sealed class AdminInventoryListRequest
{
    public int? Page { get; init; }

    public int? PageSize { get; init; }

    public string? Q { get; init; }

    public bool? LowStockOnly { get; init; }
}

// ---- Responses ----

public sealed record AdminProductListItem(
    Guid Id,
    string Name,
    string Slug,
    string BrandName,
    string CategoryName,
    bool IsPublished,
    bool IsFeatured,
    int VariantCount,
    decimal? MinPrice,
    int AvailableUnits,
    DateTimeOffset UpdatedAt);

public sealed record AdminVariantResponse(
    Guid Id,
    string Sku,
    string Name,
    decimal Price,
    decimal? CompareAtPrice,
    int OnHand,
    int Reserved,
    int Available,
    int LowStockThreshold);

public sealed record AdminImageResponse(Guid Id, string Url, string AltText, int Width, int Height);

public sealed record AdminProductDetails(
    Guid Id,
    string Name,
    string Slug,
    string Description,
    Guid CategoryId,
    Guid BrandId,
    bool IsPublished,
    bool IsFeatured,
    uint Version,
    DateTimeOffset UpdatedAt,
    IReadOnlyList<AdminVariantResponse> Variants,
    IReadOnlyList<AdminImageResponse> Images);

public sealed record AdminCategoryResponse(Guid Id, string Name, string Slug, Guid? ParentId, int ProductCount);

public sealed record AdminBrandResponse(Guid Id, string Name, string Slug, int ProductCount);

public sealed record InventoryItemResponse(
    Guid VariantId,
    Guid ProductId,
    string ProductName,
    string VariantName,
    string Sku,
    int OnHand,
    int Reserved,
    int Available,
    int LowStockThreshold,
    bool IsLowStock);

public sealed record InventoryMovementResponse(
    Guid Id,
    int QuantityChange,
    string Reason,
    string? Note,
    string? Reference,
    DateTimeOffset CreatedAt);

public sealed record AuditLogEntryResponse(
    Guid Id,
    string ActorEmail,
    string Action,
    string EntityType,
    string EntityId,
    string Summary,
    DateTimeOffset CreatedAt);
