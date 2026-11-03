using Nexora.Domain.Catalog;
using Nexora.Domain.Common;

namespace Nexora.Application.Catalog;

public enum ProductSort
{
    Relevance,
    PriceAsc,
    PriceDesc,
    NameAsc,
}

/// <summary>Raw query-string values as received from the client. Everything is optional.</summary>
public sealed class ProductListRequest
{
    public int? Page { get; init; }

    public int? PageSize { get; init; }

    public string? Q { get; init; }

    public string? Category { get; init; }

    public string? Brand { get; init; }

    public decimal? MinPrice { get; init; }

    public decimal? MaxPrice { get; init; }

    public bool? InStock { get; init; }

    public string? Sort { get; init; }
}

/// <summary>Validated, normalized catalog query. Only created through <see cref="Create"/>.</summary>
public sealed record ProductListQuery
{
    public const int DefaultPageSize = 24;
    public const int MaxPageSize = 48;
    public const int MaxSearchLength = 100;

    private static readonly Dictionary<string, ProductSort> SortValues = new(StringComparer.Ordinal)
    {
        ["relevance"] = ProductSort.Relevance,
        ["price_asc"] = ProductSort.PriceAsc,
        ["price_desc"] = ProductSort.PriceDesc,
        ["name_asc"] = ProductSort.NameAsc,
    };

    private ProductListQuery()
    {
    }

    public int Page { get; private init; } = 1;

    public int PageSize { get; private init; } = DefaultPageSize;

    public string? Search { get; private init; }

    public string? CategorySlug { get; private init; }

    public string? BrandSlug { get; private init; }

    public decimal? MinPrice { get; private init; }

    public decimal? MaxPrice { get; private init; }

    public bool InStockOnly { get; private init; }

    public ProductSort Sort { get; private init; }

    public static IReadOnlyCollection<string> SupportedSortValues => SortValues.Keys;

    /// <summary>
    /// Validates the raw request. Returns the query, or the validation errors keyed by the
    /// query-string parameter name so the client can map them back.
    /// </summary>
    public static (ProductListQuery? Query, Dictionary<string, string[]> Errors) Create(ProductListRequest request)
    {
        ArgumentNullException.ThrowIfNull(request);

        var errors = new Dictionary<string, string[]>(StringComparer.Ordinal);

        if (request.Page is < 1)
        {
            errors["page"] = ["page must be 1 or greater."];
        }

        if (request.PageSize is < 1 or > MaxPageSize)
        {
            errors["pageSize"] = [$"pageSize must be between 1 and {MaxPageSize}."];
        }

        var search = string.IsNullOrWhiteSpace(request.Q) ? null : request.Q.Trim();
        if (search?.Length > MaxSearchLength)
        {
            errors["q"] = [$"q must be at most {MaxSearchLength} characters."];
        }

        if (request.Category is not null && !Guard.IsValidSlug(request.Category))
        {
            errors["category"] = ["category must be a valid slug."];
        }

        if (request.Brand is not null && !Guard.IsValidSlug(request.Brand))
        {
            errors["brand"] = ["brand must be a valid slug."];
        }

        if (request.MinPrice is < 0 or > Price.MaxAmount)
        {
            errors["minPrice"] = [$"minPrice must be between 0 and {Price.MaxAmount}."];
        }

        if (request.MaxPrice is < 0 or > Price.MaxAmount)
        {
            errors["maxPrice"] = [$"maxPrice must be between 0 and {Price.MaxAmount}."];
        }

        if (request is { MinPrice: { } min, MaxPrice: { } max } && min > max)
        {
            errors["minPrice"] = ["minPrice cannot be greater than maxPrice."];
        }

        var sort = ProductSort.Relevance;
        if (request.Sort is not null && !SortValues.TryGetValue(request.Sort, out sort))
        {
            errors["sort"] = [$"sort must be one of: {string.Join(", ", SortValues.Keys)}."];
        }

        if (errors.Count > 0)
        {
            return (null, errors);
        }

        var query = new ProductListQuery
        {
            Page = request.Page ?? 1,
            PageSize = request.PageSize ?? DefaultPageSize,
            Search = search,
            CategorySlug = request.Category,
            BrandSlug = request.Brand,
            MinPrice = request.MinPrice,
            MaxPrice = request.MaxPrice,
            InStockOnly = request.InStock ?? false,
            Sort = sort,
        };

        return (query, errors);
    }
}
