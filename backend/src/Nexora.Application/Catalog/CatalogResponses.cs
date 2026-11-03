namespace Nexora.Application.Catalog;

// Public API contracts for the storefront catalog. Prices are PEN, IGV included.

public sealed record ProductImageResponse(string Url, string AltText, int Width, int Height);

public sealed record ProductSummaryResponse(
    Guid Id,
    string Slug,
    string Name,
    string BrandName,
    string CategorySlug,
    ProductImageResponse? PrimaryImage,
    decimal Price,
    decimal? CompareAtPrice,
    string Currency,
    bool IsInStock);

public sealed record ProductVariantResponse(
    Guid Id,
    string Sku,
    string Name,
    decimal Price,
    decimal? CompareAtPrice,
    bool IsInStock,
    bool IsLowStock);

public sealed record ProductDetailsResponse(
    Guid Id,
    string Slug,
    string Name,
    string Description,
    string BrandName,
    string BrandSlug,
    string CategoryName,
    string CategorySlug,
    string Currency,
    IReadOnlyList<ProductImageResponse> Images,
    IReadOnlyList<ProductVariantResponse> Variants);

public sealed record CategoryResponse(Guid Id, string Name, string Slug, string? ParentSlug);

public sealed record BrandResponse(Guid Id, string Name, string Slug);
