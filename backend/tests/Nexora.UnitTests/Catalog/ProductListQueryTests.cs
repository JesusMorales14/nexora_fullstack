using Nexora.Application.Catalog;

namespace Nexora.UnitTests.Catalog;

public sealed class ProductListQueryTests
{
    [Fact]
    public void EmptyRequestUsesDefaults()
    {
        var (query, errors) = ProductListQuery.Create(new ProductListRequest());

        Assert.Empty(errors);
        Assert.NotNull(query);
        Assert.Equal(1, query.Page);
        Assert.Equal(ProductListQuery.DefaultPageSize, query.PageSize);
        Assert.Equal(ProductSort.Relevance, query.Sort);
        Assert.False(query.InStockOnly);
    }

    [Fact]
    public void SearchIsTrimmedAndBlankSearchIsIgnored()
    {
        var (trimmed, _) = ProductListQuery.Create(new ProductListRequest { Q = "  mouse  " });
        var (blank, _) = ProductListQuery.Create(new ProductListRequest { Q = "   " });

        Assert.Equal("mouse", trimmed?.Search);
        Assert.Null(blank?.Search);
    }

    [Theory]
    [InlineData("price_asc", ProductSort.PriceAsc)]
    [InlineData("price_desc", ProductSort.PriceDesc)]
    [InlineData("name_asc", ProductSort.NameAsc)]
    [InlineData("relevance", ProductSort.Relevance)]
    public void SupportedSortValuesAreParsed(string sort, ProductSort expected)
    {
        var (query, _) = ProductListQuery.Create(new ProductListRequest { Sort = sort });

        Assert.Equal(expected, query?.Sort);
    }

    [Fact]
    public void InvalidValuesReturnErrorsKeyedByQueryParameter()
    {
        var (query, errors) = ProductListQuery.Create(new ProductListRequest
        {
            Page = 0,
            PageSize = ProductListQuery.MaxPageSize + 1,
            Sort = "cheapest",
            Category = "Not A Slug",
            Q = new string('a', ProductListQuery.MaxSearchLength + 1),
        });

        Assert.Null(query);
        Assert.Equal(["page", "pageSize", "q", "category", "sort"], errors.Keys);
    }

    [Fact]
    public void MinPriceGreaterThanMaxPriceIsRejected()
    {
        var (query, errors) = ProductListQuery.Create(new ProductListRequest { MinPrice = 500, MaxPrice = 100 });

        Assert.Null(query);
        Assert.True(errors.ContainsKey("minPrice"));
    }
}
