using System.Net;
using System.Net.Http.Json;
using Microsoft.AspNetCore.Mvc;
using Nexora.Application.Catalog;
using Nexora.Application.Common;

namespace Nexora.IntegrationTests.Catalog;

public sealed class ProductsEndpointTests(NexoraApiFactory factory)
{
    // Seed facts (CatalogSeeder): 15 published products + 1 unpublished draft.
    private const int PublishedProductCount = 15;
    private const string DraftSlug = "lenovo-legion-pro-7";
    private const string OutOfStockSlug = "asus-rog-strix-g16";
    private static readonly string[] PeripheralSubcategorySlugs = ["teclados", "mouse"];

    private readonly HttpClient _client = factory.CreateClient();

    private static CancellationToken CancellationToken => TestContext.Current.CancellationToken;

    private async Task<PagedResponse<ProductSummaryResponse>> ListAsync(string queryString)
    {
        var page = await _client.GetFromJsonAsync<PagedResponse<ProductSummaryResponse>>(
            new Uri($"/api/v1/products{queryString}", UriKind.Relative), CancellationToken);

        Assert.NotNull(page);
        return page;
    }

    [Fact]
    public async Task ListReturnsOnlyPublishedProductsPaginated()
    {
        var page = await ListAsync("?pageSize=10");

        Assert.Equal(PublishedProductCount, page.TotalCount);
        Assert.Equal(2, page.TotalPages);
        Assert.Equal(10, page.Items.Count);
        Assert.DoesNotContain(page.Items, product => product.Slug == DraftSlug);
        Assert.All(page.Items, product => Assert.Equal("PEN", product.Currency));
    }

    [Fact]
    public async Task PagesDoNotOverlap()
    {
        var first = await ListAsync("?pageSize=8&page=1&sort=name_asc");
        var second = await ListAsync("?pageSize=8&page=2&sort=name_asc");

        Assert.Empty(first.Items.Select(p => p.Id).Intersect(second.Items.Select(p => p.Id)));
        Assert.Equal(PublishedProductCount, first.Items.Count + second.Items.Count);
    }

    [Fact]
    public async Task SortByPriceAscendingOrdersByLowestVariantPrice()
    {
        var page = await ListAsync($"?sort=price_asc&pageSize={ProductListQuery.MaxPageSize}");

        var prices = page.Items.Select(product => product.Price).ToList();
        Assert.Equal(prices.Order(), prices);
    }

    [Fact]
    public async Task CategoryFilterIncludesSubcategories()
    {
        var page = await ListAsync("?category=perifericos");

        Assert.Equal(4, page.TotalCount);
        Assert.All(page.Items, product => Assert.Contains(product.CategorySlug, PeripheralSubcategorySlugs));
    }

    [Fact]
    public async Task InStockFilterExcludesProductsWithoutAvailableUnits()
    {
        var page = await ListAsync($"?inStock=true&pageSize={ProductListQuery.MaxPageSize}");

        Assert.DoesNotContain(page.Items, product => product.Slug == OutOfStockSlug);
        Assert.All(page.Items, product => Assert.True(product.IsInStock));
    }

    [Fact]
    public async Task PriceRangeFilterMatchesVariantsWithinRange()
    {
        var page = await ListAsync("?minPrice=1000&maxPrice=1500");

        Assert.NotEmpty(page.Items);
        Assert.All(page.Items, product => Assert.InRange(product.Price, 0m, 1500m));
    }

    [Fact]
    public async Task SearchMatchesNameCaseInsensitively()
    {
        var page = await ListAsync("?q=LOGITECH");

        // MX Keys S, MX Master 3S, G305 and G435.
        Assert.Equal(4, page.TotalCount);
    }

    [Theory]
    [InlineData("%25")]
    [InlineData("_")]
    public async Task SearchTreatsLikeWildcardsAsLiterals(string wildcard)
    {
        var page = await ListAsync($"?q={wildcard}");

        Assert.Equal(0, page.TotalCount);
    }

    [Fact]
    public async Task InvalidQueryReturnsValidationProblemDetails()
    {
        var response = await _client.GetAsync(
            new Uri("/api/v1/products?pageSize=500&sort=cheapest", UriKind.Relative), CancellationToken);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Equal("application/problem+json", response.Content.Headers.ContentType?.MediaType);

        var problem = await response.Content.ReadFromJsonAsync<ValidationProblemDetails>(CancellationToken);
        Assert.NotNull(problem);
        Assert.Contains("pageSize", problem.Errors.Keys);
        Assert.Contains("sort", problem.Errors.Keys);
        Assert.True(problem.Extensions.ContainsKey("traceId"));
    }

    [Fact]
    public async Task DetailsReturnVariantsOrderedByPrice()
    {
        var product = await _client.GetFromJsonAsync<ProductDetailsResponse>(
            new Uri("/api/v1/products/samsung-galaxy-s25", UriKind.Relative), CancellationToken);

        Assert.NotNull(product);
        Assert.Equal(2, product.Variants.Count);
        Assert.True(product.Variants[0].Price < product.Variants[1].Price);
        Assert.NotEmpty(product.Images);
    }

    [Fact]
    public async Task DraftProductDetailsAreNotFound()
    {
        var response = await _client.GetAsync(new Uri($"/api/v1/products/{DraftSlug}", UriKind.Relative), CancellationToken);

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        Assert.Equal("application/problem+json", response.Content.Headers.ContentType?.MediaType);
    }

    [Fact]
    public async Task CategoriesAndBrandsAreListed()
    {
        var categories = await _client.GetFromJsonAsync<List<CategoryResponse>>(
            new Uri("/api/v1/categories", UriKind.Relative), CancellationToken);
        var brands = await _client.GetFromJsonAsync<List<BrandResponse>>(
            new Uri("/api/v1/brands", UriKind.Relative), CancellationToken);

        Assert.Contains(categories!, category => category is { Slug: "teclados", ParentSlug: "perifericos" });
        Assert.Equal(8, brands!.Count);
    }
}
