using Nexora.Domain.Catalog;
using Nexora.Domain.Common;

namespace Nexora.UnitTests.Catalog;

public sealed class ProductTests
{
    private static readonly DateTimeOffset Now = new(2026, 11, 3, 12, 0, 0, TimeSpan.Zero);

    private static Product CreateProduct() =>
        new("Laptop de prueba", "laptop-de-prueba", "Descripción", new Category("Laptops", "laptops"), new Brand("Marca", "marca"), Now);

    [Fact]
    public void PublishWithoutVariantsIsRejected()
    {
        var product = CreateProduct();

        var exception = Assert.Throws<DomainException>(() => product.Publish(Now));

        Assert.Contains("variant", exception.Message, StringComparison.OrdinalIgnoreCase);
        Assert.False(product.IsPublished);
    }

    [Fact]
    public void PublishWithVariantMakesProductVisible()
    {
        var product = CreateProduct();
        product.AddVariant("SKU-1", "Base", 1999.90m, initialStock: 3);

        product.Publish(Now);

        Assert.True(product.IsPublished);
    }

    [Fact]
    public void SkuIsNormalizedToUpperCase()
    {
        var variant = CreateProduct().AddVariant("len-ips3-r5", "Base", 100m);

        Assert.Equal("LEN-IPS3-R5", variant.Sku);
    }

    [Fact]
    public void DuplicateSkuWithinProductIsRejected()
    {
        var product = CreateProduct();
        product.AddVariant("SKU-1", "Negro", 100m);

        Assert.Throws<DomainException>(() => product.AddVariant("sku-1", "Blanco", 100m));
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-10)]
    [InlineData(10.555)]
    [InlineData(1_000_000.01)]
    public void InvalidPricesAreRejected(decimal price)
    {
        Assert.Throws<DomainException>(() => CreateProduct().AddVariant("SKU-1", "Base", price));
    }

    [Theory]
    [InlineData(100)]
    [InlineData(99.99)]
    public void CompareAtPriceMustBeGreaterThanPrice(decimal compareAtPrice)
    {
        Assert.Throws<DomainException>(() => CreateProduct().AddVariant("SKU-1", "Base", 100m, compareAtPrice));
    }

    [Fact]
    public void NegativeInitialStockIsRejected()
    {
        Assert.Throws<DomainException>(() => CreateProduct().AddVariant("SKU-1", "Base", 100m, initialStock: -1));
    }

    [Fact]
    public void InventoryReportsAvailabilityAndLowStock()
    {
        var variant = CreateProduct().AddVariant("SKU-1", "Base", 100m, initialStock: 3, lowStockThreshold: 5);

        Assert.Equal(3, variant.Inventory.Available);
        Assert.True(variant.Inventory.IsInStock);
        Assert.True(variant.Inventory.IsLowStock);
    }

    [Theory]
    [InlineData("Laptop")]
    [InlineData("laptop gamer")]
    [InlineData("laptop--gamer")]
    [InlineData("-laptop")]
    [InlineData("laptóp")]
    public void InvalidSlugsAreRejected(string slug)
    {
        Assert.Throws<DomainException>(() => new Brand("Marca", slug));
    }

    [Fact]
    public void ImagesRequireDimensionsToPreventLayoutShift()
    {
        Assert.Throws<DomainException>(() => CreateProduct().AddImage("/images/a.svg", "Alt", 0, 800));
    }

    [Theory]
    [InlineData("javascript:alert(1)")]
    [InlineData("http://insecure.example/a.png")]
    [InlineData("//evil.example/a.png")]
    public void UnsafeImageUrlsAreRejected(string url)
    {
        Assert.Throws<DomainException>(() => CreateProduct().AddImage(url, "Alt", 800, 800));
    }
}
